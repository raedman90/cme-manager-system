// usecases/lote/listLotes.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

type ListArgs = {
  q?: string;
  page?: number;
  perPage?: number;
  sort?: string;              // "numero" | "criadoEm" | "materialCount"
  order?: "asc" | "desc";
};

const SORT_WHITELIST = ["numero", "criadoEm", "materialCount"] as const;
type SortField = typeof SORT_WHITELIST[number];

function sanitizeSort(s?: string): SortField {
  return (SORT_WHITELIST as readonly string[]).includes(s || "") ? (s as SortField) : "criadoEm";
}

export async function listLotesUseCase(args: ListArgs) {
  const page = Math.max(1, Number(args.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(args.perPage ?? 10)));
  const sort = sanitizeSort(args.sort);
  const order = args.order ?? "desc";

  const where: any = {};
  if (args.q) {
    where.OR = [
      { numero: { contains: args.q, mode: "insensitive" } },
      // busca por materiais ligados (nome/codigo) se desejar:
      { materiais: { some: {
          OR: [
            { nome:   { contains: args.q, mode: "insensitive" } },
            { codigo: { contains: args.q, mode: "insensitive" } },
          ],
      }}},
    ];
  }

  // monta orderBy
  const orderBy =
    sort === "materialCount"
      ? { materiais: { _count: order } } // Prisma 5: order by relation count
      : { [sort]: order };

  const [total, items] = await Promise.all([
    prisma.lote.count({ where }),
    prisma.lote.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      include: { _count: { select: { materiais: true } } }, // para materialCount
    }),
  ]);

  return { data: items, meta: { total, page, perPage } };
}
