import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { createUserSchema, updateUserSchema } from "../dtos/IUserDTO";
import bcrypt from "bcryptjs";
import streamifier from "streamifier";
import { cloudinary } from "../lib/cloudinary";

const prisma = new PrismaClient();

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? "1")), 1);
    const perPage = Math.min(Math.max(parseInt(String(req.query.perPage ?? "10")), 1), 100);
    const q = (String(req.query.q ?? "")).trim();
    const role = (req.query.role as "ADMIN"|"TECH"|"AUDITOR" | undefined) ?? undefined;

    // sort: name | email | role | createdAt | updatedAt | badgeCode
    const sort = (String(req.query.sort ?? "createdAt")) as keyof any;
    const order = String(req.query.order ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { badgeCode: { contains: q, mode: "insensitive" } },
      ];
    }
    if (role) where.role = role;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      sort,
      order,
    });
  } catch (e) { next(e); }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    res.json(user);
  } catch (e) { next(e); }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(parsed.password, 10);

    const user = await prisma.user.create({
      data: { ...parsed, password: passwordHash },
    });

    // por segurança, não retornar hash
    const { password, ...safe } = user as any;
    res.status(201).json(safe);
  } catch (e) { next(e); }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const parsed = updateUserSchema.parse(req.body);

    const data: any = { ...parsed };
    if (parsed.password) {
      data.password = await bcrypt.hash(parsed.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    });

    const { password, ...safe } = user as any;
    res.json(safe);
  } catch (e) { next(e); }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function uploadProfilePicture(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file?.buffer) return res.status(400).json({ message: "Arquivo obrigatório" });

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "cme/users",
        public_id: `user_${id}_${Date.now()}`,
        overwrite: true,
        resource_type: "image",
        transformation: [
          { width: 512, height: 512, crop: "fill", gravity: "auto" },
          { fetch_format: "auto", quality: "auto" },
        ],
      },
      async (err, result) => {
        if (err || !result) return next(err ?? new Error("Falha no upload"));
        const user = await prisma.user.update({
          where: { id },
          data: { photoUrl: result.secure_url },
          select: { id: true, name: true, email: true, role: true, badgeCode: true, photoUrl: true },
        });
        res.json(user);
      }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  } catch (e) {
    next(e);
  }
}

export async function verifyBadgeController(req: Request, res: Response) {
  const code = String(req.body?.badgeCode ?? req.query?.badgeCode ?? "").trim();
  if (!code) return res.status(400).json({ message: "badgeCode é obrigatório" });

  const user = await prisma.user.findFirst({
    where: { badgeCode: code, role: "TECH" },
    select: { id: true, name: true, badgeCode: true, role: true },
  });

  if (!user) return res.status(404).json({ message: "Crachá não encontrado ou usuário não é TECH" });
  return res.json({ ok: true, user });
}