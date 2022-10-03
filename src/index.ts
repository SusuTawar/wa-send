import express from 'express'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import whatsapp from './module/whatsapp/index'
import manage from './routes/manage'
import send from './routes/send'
import root from './routes/root'

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

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`)
})