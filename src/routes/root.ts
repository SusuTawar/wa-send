import { Router } from 'express'

export default () => {
  const router = Router()

  router.get('/', (req, res) => {
    res.send('').status(204)
  })

  router.get('/ping', (req, res) => {
    res.json({ message: 'pong' })
  })

  return router
}