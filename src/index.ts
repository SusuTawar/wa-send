import express from 'express'
import { config } from 'dotenv'
import { PrismaClient, Project } from '@prisma/client'
import whatsapp from './module/whatsapp/index'
import manage from './routes/manage'
import send from './routes/send'
import root from './routes/root'
import { thenCatch } from './utils/then-catch'

// load environment variables from .env file
config()

const app = express()
const db = new PrismaClient()
const wa = whatsapp(db)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/', root())
app.use('/manage', manage(db, wa))
app.use('/send', send(db, wa))

app.listen(process.env.PORT, async () => {
  console.log(`Server is running on port ${process.env.PORT}`)

  // start whatsapp client
  console.log('Starting whatsapp client...')
  const [res, err] = await thenCatch(db.project.findMany({
    where: {
      active: true
    }
  }))
  if (err) {
    console.log(err)
    process.exit(1)
  }
  const resP = (res as Project[]).map(async (project) => {
    console.log(`Starting whatsapp client for project ${project.name}`)
    const r = await wa.load(project.slug)
    if (typeof r === 'string') {
      db.project.update({
        where: { id: project.id },
        data: { active: false },
      })
      console.log(`Failed to start whatsapp client for project ${project.name}, please start it manually`)
    } else {
      console.log(`Started whatsapp client for project ${project.name}`)
    }
  })
  await Promise.all(resP)
  console.log('Whatsapp client started')
})