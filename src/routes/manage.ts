import { Router } from 'express'
import { nanoid } from 'nanoid'
import { genSalt, hash } from 'bcryptjs'
import qrcode from 'qrcode'
import RouteParams from './interfaces/route-params'

export default ({ db, whatsapp, passport }: RouteParams) => {
  const router = Router()

  router.use(passport.authenticate('jwt', { session: false }))

  router.get('/', async (req, res) => {
    const projects = await db.project.findMany()
    const ret = projects.map(({ id, slug, name, desc }) => ({
      id,
      slug,
      name,
      desc,
    }))
    res.json(ret)
  })

  router.post('/', async (req, res) => {
    const { slug, name, desc } = req.body
    const token = nanoid(32)
    const salt = await genSalt(10)
    const tokenHash = await hash(token, salt)

    const project = await db.project.create({
      data: {
        slug,
        name,
        desc,
        token: tokenHash,
      },
    })

    project.token = token
    res.json({
      data: project,
      message: 'Token only shown once here',
    })
  })

  router.use('/:slug', async (req, res, next) => {
    const { slug } = req.params
    const project = await db.project.findUnique({
      where: {
        slug,
      },
    })
    if (!project) return res.status(404).json({ message: 'Project not found' })
    req.project = project
    next()
  })

  router.get('/:slug', async (req, res) => {
    const { project } = req
    if (!project) return res.status(404).json({ message: 'Project not found' })
    res.json({
      name: project.name,
      slug: project.slug,
      description: project.desc,
    })
  })

  router.get('/:slug/start', async (req, res) => {
    const { type } = req.query
    const { slug } = req.params
    try {
      const qr = await whatsapp.load(slug)
      if (typeof qr === 'string') {
        switch (type) {
          case 'image':
            return qrcode.toFileStream(res, qr)
          default:
            return res.json({
              qr: qrcode.toDataURL(qr),
              message: 'Scan this QR code',
            })
        }
      }
      res.json({ message: 'Client started' })
    } catch (e) {
      const err = e as Error
      res.status(400).json({ message: err.message })
    }
  })

  router.get('/:slug/stop', async (req, res) => {
    const { slug } = req.params
    try {
      await whatsapp.remove(slug)
      res.json({ message: 'Client stopped' })
    } catch (e) {
      const err = e as Error
      res.status(400).json({ message: err.message })
    }
  })

  router.post('/:slug/regenerate', async (req, res) => {
    const { slug } = req.params
    const token = nanoid(32)
    const salt = await genSalt(10)
    const tokenHash = await hash(token, salt)
    await db.project.update({
      where: {
        slug,
      },
      data: {
        token: tokenHash,
      },
    })
    res.json({
      token,
      message: 'Token only shown once here',
    })
  })

  router.delete('/:slug', async (req, res) => {
    const { slug } = req.params
    const project = await db.project.delete({
      where: {
        slug,
      },
    })
    res.json({
      data: project,
      message: 'Project deleted',
    })
  })

  return router
}
