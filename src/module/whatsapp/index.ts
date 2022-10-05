import { PrismaClient } from '.prisma/client'
import { Client, LocalAuth } from 'whatsapp-web.js'

export default (db: PrismaClient): Whatsapp => {
  const clients = new Map<string, Client>()

  async function load(slug: string): Promise<string|true> {
    const project = await db.project.findFirst({
      where: { slug },
    })
    if (!project || clients.has(project.id))
      throw new Error('Client already exists')
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: project.id }),
      puppeteer: {
        args: ['--no-sandbox'],
      },
    })

    client.on('disconnected', reason => {
      console.log('Client was logged out', reason)
      if (clients.has(project.id)) clients.delete(project.id)
      db.project.update({
        where: { id: project.id },
        data: { active: false },
      })
    })

    client.on('ready', () => {
      console.log('ready')
      if (!clients.has(project.id)) clients.set(project.id, client)
    })

    client.on('message', msg => {
      if (msg.body === 'ping') {
        msg.reply('pong')
      }
    })

    return new Promise((resolve, reject) => {
      client.initialize()
      let resolveCheck = false

      const timeout = setTimeout(() => {
        client.destroy()
        if (!resolveCheck) reject('Timeout')
      }, 30 * 1000); // 30 seconds

      client.on('authenticated', async () => {
        console.log(`Client authenticated for project ${project.name}`)
        await db.project.update({
          where: { id: project.id },
          data: { active: true },
        })
        clearTimeout(timeout)
        if (!resolveCheck) {
          resolve(true)
          resolveCheck = true
        }
      })

      client.on('qr', qr => {
        clearTimeout(timeout)
        if (!resolveCheck) {
          resolve(qr)
          resolveCheck = true
        }
      })

      client.on('auth_failure', async reason => {
        clearTimeout(timeout)
        reject(reason)
      })
    })
  }

  async function remove(slug: string): Promise<void> {
    const project = await db.project.findFirst({
      where: { slug },
    })
    if (!project || !clients.has(project.id))
      throw new Error('Client not found')
    const client = clients.get(project.id)
    if (client) await client.destroy()
    clients.delete(project.id)
  }

  return {
    load,
    remove,
    clients,
  }
}

export type Whatsapp = {
  load: (slug: string) => Promise<string|true>
  remove: (slug: string) => Promise<void>
  clients: Map<string, Client>
}
