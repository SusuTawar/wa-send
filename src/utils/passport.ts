import { PrismaClient } from '@prisma/client'
import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt'
import { thenCatch } from './then-catch'
import { compare } from 'bcryptjs'
import { KeyPair } from './ensureKey'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface User {
      id: string
    }
  }
}

export default function (db: PrismaClient, keypair: KeyPair) {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
      },
      async (username, password, done) => {
        const [user, userErr] = await thenCatch(
          db.user.findUnique({
            where: { username },
          }),
        )
        if (userErr) return done(userErr)
        if (!user) return done(null, false)
        const [match, matchErr] = await thenCatch(
          compare(password, user.password),
        )
        if (matchErr) return done(matchErr)
        if (!match) return done(null, false)
        return done(null, user)
      },
    ),
  )

  passport.use(
    new JWTStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: keypair.privateKey,
        algorithms: ['RS256'],
      },
      async (payload, done) => {
        const [user, userErr] = await thenCatch(
          db.user.findUnique({
            where: { id: payload.sub },
          }),
        )
        if (userErr) return done(userErr)
        if (!user) return done(null, false)
        return done(null, user)
      },
    ),
  )

  passport.serializeUser((user, done) => {
    done(null, user.id)
  })

  passport.deserializeUser(async (id, done) => {
    if (!id) return done(null, false)
    const [user, userErr] = await thenCatch(
      db.user.findUnique({
        where: { id: id as string },
      }),
    )
    if (userErr) return done(userErr)
    if (!user) return done(null, false)
    return done(null, user)
  })

  return passport
}
