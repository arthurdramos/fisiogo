import * as React from 'react'
import { Text } from '@react-email/components'
import { FisioLayout, p } from './layout'

interface Props { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ confirmationUrl }: Props) => (
  <FisioLayout preview="Você foi convidado para a FisioGO" title="Você foi convidado!" buttonLabel="Aceitar convite" buttonUrl={confirmationUrl} footer="Se você não esperava este convite, pode ignorar este email com tranquilidade.">
    <Text style={p}>Você recebeu um convite para criar sua conta na <strong>FisioGO</strong>. Clique no botão abaixo para aceitar e começar.</Text>
  </FisioLayout>
)
export default InviteEmail
