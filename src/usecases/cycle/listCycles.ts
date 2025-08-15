import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export type CycleSortField = "timestamp" | "etapa" | "responsavel";
export type SortOrder = "asc" | "desc";

export type ListCyclesArgs = {
  loteId?: string;
  materialId?: string;
  etapa?: string;
  q?: string;
  page?: number;
  perPage?: number;
  sort?: CycleSortField;
  order?: SortOrder;
};

export type ListCyclesResponse<T = any> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
};
export async function listCyclesUseCase(args: ListCyclesArgs = {}): Promise<ListCyclesResponse> {
  const {
    loteId,
    materialId,
    etapa,
    q,
    page = 1,
    perPage = 10,
    sort = "timestamp",
    order = "desc",
  } = args as {
    loteId?: string;
    materialId?: string;
    etapa?: string;
    q?: string;
    page?: number;
    perPage?: number;
    sort?: CycleSortField;
    order?: SortOrder;
  };

  const where: any = {};
  if (materialId) where.materialId = materialId;
  if (etapa) where.etapa = etapa.toUpperCase();
  // BUGFIX: filtrar pelo próprio lote do ciclo (ajuste conforme seu schema)
  if (loteId) where.loteId = loteId; // se o model tiver 'loteId' direto
  // Se seu schema NÃO tem 'loteId' em Cycle e a relação é via 'lote':
  // if (loteId) where.lote = { id: loteId };

  if (q && q.trim()) {
    where.OR = [
      { responsavel: { contains: q, mode: "insensitive" } },
      { material: { nome: { contains: q, mode: "insensitive" } } },
      { material: { codigo: { contains: q, mode: "insensitive" } } },
      { lote: { numero: { contains: q, mode: "insensitive" } } },
    ];
  }

  // Ordenação segura
  const orderBy = { [sort]: order } as any;

  // Paginação real
  const [total, rows] = await Promise.all([
    prisma.cycle.count({ where }),
    prisma.cycle.findMany({
      where,
      include: {
        material: { select: { id: true, nome: true, codigo: true } },
        lote: { select: { id: true, numero: true, nome: true } },
      },
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  // Mapeia extras que o front lê direto
  const data = rows.map((r) => ({
    ...r,
    materialName: r.material?.nome ?? null,
    materialCode: r.material?.codigo ?? null,
    loteNumero: r.lote?.numero ?? null,
    loteNome: r.lote?.nome ?? null,
  }));

  return { data, total, page, perPage };
}
