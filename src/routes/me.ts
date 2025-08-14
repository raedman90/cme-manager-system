// src/routes/me.ts
import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import multer from "multer";
import streamifier from "streamifier";
import { cloudinary } from "../lib/cloudinary";
import { autenticarJWT } from "../middlewares/authMiddleware";

const prisma = new PrismaClient();
export const meRouter = Router();

// ---- auth helper (use o id do seu middleware JWT) ----
function getAuthUserId(req: Request): string | null {
  // se seu autenticarJWT popula req.user.id, basta isso:
  const id = (req as any)?.user?.id as string | undefined;
  if (id) return id;
  // fallback de DEV (ex: via header)
  return (req.headers["x-user-id"] as string) || null;
}

// ---- multer em memória (pra enviar pro Cloudinary) ----
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.mimetype);
    if (!ok) return cb(new Error("Formato inválido (JPG/PNG/WEBP)"));
    cb(null, true);
  },
});

// proteger todas as rotas abaixo
meRouter.use(autenticarJWT);

/** GET /me — dados do usuário logado */
meRouter.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = getAuthUserId(req);
    if (!uid) return res.status(401).json({ message: "Não autenticado" });

    const me = await prisma.user.findUnique({ where: { id: uid } });
    if (!me) return res.status(404).json({ message: "Usuário não encontrado" });

    const { password, ...safe } = me as any;
    res.json(safe);
  } catch (e) {
    next(e);
  }
});

/** PUT /me — atualiza nome */
meRouter.put("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = getAuthUserId(req);
    if (!uid) return res.status(401).json({ message: "Não autenticado" });

    const name = String(req.body?.name ?? "").trim();
    if (name.length < 2) return res.status(400).json({ message: "Nome inválido" });

    const me = await prisma.user.update({
      where: { id: uid },
      data: { name },
    });

    const { password, ...safe } = me as any;
    res.json(safe);
  } catch (e) {
    next(e);
  }
});

/** POST /me/password — troca senha { current, next } */
meRouter.post("/me/password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = getAuthUserId(req);
    if (!uid) return res.status(401).json({ message: "Não autenticado" });

    const current = String(req.body?.current ?? "");
    const next = String(req.body?.next ?? "");
    if (current.length < 6 || next.length < 6) {
      return res.status(400).json({ message: "Senhas devem ter ao menos 6 caracteres" });
    }

    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    const ok = await bcrypt.compare(current, user.password);
    if (!ok) return res.status(400).json({ message: "Senha atual incorreta" });

    const hash = await bcrypt.hash(next, 12);
    await prisma.user.update({ where: { id: uid }, data: { password: hash } });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** GET /me/badge — consulta crachá do usuário logado */
meRouter.get("/me/badge", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = getAuthUserId(req);
    if (!uid) return res.status(401).json({ message: "Não autenticado" });

    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, name: true, role: true, badgeCode: true },
    });
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

/** POST /me/badge/rotate — emite um novo crachá para o usuário logado */
meRouter.post("/me/badge/rotate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = getAuthUserId(req);
    if (!uid) return res.status(401).json({ message: "Não autenticado" });

    const prefix = "BADGE";
    const token = Array.from({ length: 6 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]).join("");
    const newCode = `${prefix}-${token}`;

    const updated = await prisma.user.update({
      where: { id: uid },
      data: { badgeCode: newCode },
      select: { id: true, name: true, badgeCode: true, role: true },
    });

    res.json({ ok: true, user: updated });
  } catch (e) {
    next(e);
  }
});

/** POST /me/avatar — upload de avatar (multipart: field "file") via Cloudinary */
meRouter.post(
  "/me/avatar",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = getAuthUserId(req);
      if (!uid) return res.status(401).json({ message: "Não autenticado" });
      if (!req.file?.buffer) return res.status(400).json({ message: "Arquivo obrigatório (file)" });

      // Upload via streamifier -> cloudinary.upload_stream
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "cme/users",
          public_id: `user_${uid}_${Date.now()}`,
          overwrite: true,
          resource_type: "image",
          transformation: [
            { width: 512, height: 512, crop: "fill", gravity: "auto" },
            { fetch_format: "auto", quality: "auto" },
          ],
        },
        async (err, result) => {
          if (err || !result) return next(err ?? new Error("Falha no upload"));

          await prisma.user.update({
            where: { id: uid },
            data: { photoUrl: result.secure_url },
          });
          res.json({ ok: true, photoUrl: result.secure_url });
        }
      );

      // envia o buffer para o stream
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    } catch (e) {
      next(e);
    }
  }
);
