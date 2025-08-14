import { PrismaClient, Role } from '@prisma/client';
const prisma = new PrismaClient();

export async function listUsersUseCase(role?: Role, q?: string) {
  return prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
    take: 100,
  });
}
