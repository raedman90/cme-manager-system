import { Request, Response, NextFunction } from 'express'

export function permitirRoles(...rolesPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.user

    if (!usuario || !rolesPermitidos.includes(usuario.role)) {
      return res.status(403).json({ error: 'Acesso não autorizado para este recurso.' })
    }

    next()
  }
}
