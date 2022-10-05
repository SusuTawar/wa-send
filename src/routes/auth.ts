import { Router } from 'express'
import { genSalt, hash } from 'bcryptjs'
import { sign } from 'jsonwebtoken'
import RouteParams from './interfaces/route-params'

export default ({ db, passport, keyPair }: RouteParams) => {
  const router = Router()

  router.post('/register', async (req, res) => {
    const { username, password } = req.body
    const salt = await genSalt(10)
    const passwordHash = await hash(password, salt)

    const user = await db.user.create({
      data: {
        username,
        password: passwordHash,
      },
    })

    res.json(user)
  })

  router.post('/login', passport.authenticate('local'), (req, res) => {
    if (!req.user) return res.json({ message: 'Invalid credentials' }).status(401)
    const token = sign({ sub: req.user.id }, keyPair.privateKey, {
      algorithm: 'RS256',
      expiresIn: '1d',
    })
    res.json({ token, message: 'Login success' })
  })

  return router
}