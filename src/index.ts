import express from 'express'
import { config } from 'dotenv'
import { PrismaClient, Project } from '@prisma/client'
import whatsapp from './module/whatsapp/index'
import manage from './routes/manage'
import send from './routes/send'
import root from './routes/root'
import { thenCatch } from './utils/then-catch'
import { getKey } from './utils/ensureKey'
import new_passport from './utils/passport'

// load environment variables from .env file
config()
;(async () => {
  const app = express()
  const db = new PrismaClient()
  const wa = whatsapp(db)
  const keyPair = await getKey()
  const passport = new_passport(db, keyPair)

  const routeParam = {
    db,
    whatsapp: wa,
    passport,
    keyPair,
  }

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.use(passport.initialize())
  app.use('/', root())
  app.use('/manage', manage(routeParam))
  app.use('/send', send(routeParam))

  app.listen(process.env.PORT, async () => {
    console.log(`Server is running on port ${process.env.PORT}`)

    // start whatsapp client
    console.log('Starting whatsapp client...')
    const [res, err] = await thenCatch(
      db.project.findMany({
        where: {
          active: true,
        },
      }),
    )
    if (err) {
      console.log(err)
      process.exit(1)
    }
    const resP = (res as Project[]).map(async project => {
      console.log(`Starting whatsapp client for project ${project.name}`)
      try {
        const r = await wa.load(project.slug)
        if (typeof r === 'string') {
          db.project.update({
            where: { id: project.id },
            data: { active: false },
          })
          throw new Error('Error starting whatsapp client')
        } else {
          console.log(`Started whatsapp client for project ${project.name}`)
        }
      } catch (e) {
        console.log(
          `Failed to start whatsapp client for project ${project.name}, please start it manually`,
        )
      }
    })
    await Promise.all(resP)
    console.log('Whatsapp client started')
  })
})()
