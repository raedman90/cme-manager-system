import { Router } from 'express'
import { login, register, me } from '../controllers/authController'
import { autenticarJWT } from '../middlewares/authMiddleware'
import { validateBody } from '../middlewares/validate'
import { AuthLoginSchema } from '../dtos/IAuthDTO'
import { CreateUserSchema } from '../dtos/IUserDTO'

export const authRoutes = Router()

authRoutes.post('/login', validateBody(AuthLoginSchema), login)
authRoutes.post('/register', validateBody(CreateUserSchema), register)
authRoutes.get('/me', autenticarJWT, me)
