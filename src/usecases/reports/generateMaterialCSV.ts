import { PrismaClient } from '@prisma/client'
import { Parser } from 'json2csv'

const prisma = new PrismaClient()

export async function generateMaterialCSV(materialId: string, startDate?: string, endDate?: string, etapa?: string): Promise<string> {
  const filtrosCiclo: any = {}

  if (startDate && endDate) {
    filtrosCiclo.timestamp = {
      gte: new Date(startDate),
      lte: new Date(endDate)
    }
  }

  if (etapa) {
    filtrosCiclo.etapa = etapa
  }

  const material = await prisma.material.findUnique({
    where: { id: materialId },
    include: {
      cycles: { where: filtrosCiclo }
    }
  })

  if (!material) throw { name: 'NotFoundError', message: 'Material não encontrado' }

  const registros = material.cycles.map(ciclo => ({
    material: material.nome,
    categoria: material.categoria,
    tipo: material.tipo,
    etapa: ciclo.etapa,
    responsavel: ciclo.responsavel,
    data: ciclo.timestamp,
    observacoes: ciclo.observacoes || ''
  }))

  const parser = new Parser()
  return parser.parse(registros)
}