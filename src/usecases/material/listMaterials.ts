import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ListArgs = {
  q?: string;
  page?: number;
  perPage?: number;
  ativo?: boolean;
  sort?: string;              // campo do banco (PT-BR)
  order?: "asc" | "desc";
};

// Campos permitidos para ordenação (batem com o seu schema Prisma)
const SORT_WHITELIST = ["nome", "codigo", "ativo", "criadoEm", "atualizadoEm"] as const;
type SortField = typeof SORT_WHITELIST[number];

function sanitizeSort(field?: string): SortField {
  return (field && (SORT_WHITELIST as readonly string[]).includes(field))
    ? (field as SortField)
    : "criadoEm";
}

export async function listMaterialsUseCase(args: ListArgs) {
  const page = Math.max(1, Number(args.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(args.perPage ?? 10)));
  const sort = sanitizeSort(args.sort);
  const order = args.order ?? "desc";

  const where: any = {};
  if (args.q) {
    where.OR = [
      { nome:   { contains: args.q, mode: "insensitive" } },
      { codigo: { contains: args.q, mode: "insensitive" } },
    ];
  }
  if (typeof args.ativo === "boolean") where.ativo = args.ativo;

  const [total, items] = await Promise.all([
    prisma.material.count({ where }),
    prisma.material.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return { data: items, meta: { total, page, perPage } };
}
