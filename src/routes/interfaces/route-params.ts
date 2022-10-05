import { PrismaClient } from "@prisma/client"
import { PassportStatic } from "passport"
import { Whatsapp } from "../../module/whatsapp"
import { KeyPair } from "../../utils/ensureKey"

type RouteParams = {
  db: PrismaClient
  whatsapp: Whatsapp
  passport: PassportStatic
  keyPair: KeyPair
}

export default RouteParams