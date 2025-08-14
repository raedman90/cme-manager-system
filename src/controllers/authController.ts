import { Request, Response } from 'express'
import { createUserUseCase } from '../usecases/user/createUser'
import { loginUseCase } from '../usecases/auth/login'
import { meUseCase } from '../usecases/auth/me'

export async function register(req: Request, res: Response) {
  const user = await createUserUseCase(req.body)
  res.status(201).json(user)
}

export async function login(req: Request, res: Response) {
  const result = await loginUseCase(req.body)
  res.json(result)
}

export async function me(req: Request, res: Response) {
  const user = await meUseCase(req.user.id)
  res.json(user)
}
