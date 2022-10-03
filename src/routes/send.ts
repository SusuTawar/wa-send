import { PrismaClient, Project } from '@prisma/client'
import { Router } from 'express'
import { compareSync } from 'bcryptjs'
import { Whatsapp } from '../module/whatsapp'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
      // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
      interface Request {
          project?: Project;
      }
  }
}

export default (db: PrismaClient, whatsapp: Whatsapp) => {
  const router = Router()

  router.use(async (req, res, next) => {
    const { 'x-token':token } = req.headers
    if (!token) return res.status(401).json({ message: 'Token is required' })
    const projects = await db.project.findMany();
    const project = projects.find((project) => {
      return compareSync(token as string, project.token)
    })
    if (!project) return res.status(401).json({ message: 'Invalid token' })
    req.project = project
    next()
  })

  router.post('/', (req, res) => {
    const { message, to } = req.body
    const { project } = req
    if (!project) return res.status(404).json({ message: 'Project not found' })
    whatsapp.clients.get(project.id)?.sendMessage(`${to}@c.us`, message) // use d.ts for group
    res.json({ message: 'Message sent' })
  })

  return router
}