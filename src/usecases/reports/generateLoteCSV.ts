import { PrismaClient } from '@prisma/client'
import { Parser } from 'json2csv'

const prisma = new PrismaClient()

export async function generateLoteCSV(loteId: string, startDate?: string, endDate?: string, etapa?: string): Promise<string> {
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

  const lote = await prisma.lote.findUnique({
    where: { id: loteId },
    include: {
      materiais: {
        include: { cycles: { where: filtrosCiclo } }
      }
    }
  })

  if (!lote) throw { name: 'NotFoundError', message: 'Lote não encontrado' }

  const registros = lote.materiais.flatMap(m => 
    m.cycles.map(ciclo => ({
      lote: lote.numero,
      material: m.nome,
      categoria: m.categoria,
      tipo: m.tipo,
      etapa: ciclo.etapa,
      responsavel: ciclo.responsavel,
      data: ciclo.timestamp,
      observacoes: ciclo.observacoes || ''
    }))
  )

  const parser = new Parser()
  return parser.parse(registros)
}
