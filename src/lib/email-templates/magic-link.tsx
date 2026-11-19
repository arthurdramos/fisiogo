import * as React from 'react'
import { Text } from '@react-email/components'
import { FisioLayout, p } from './layout'

interface Props { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ confirmationUrl }: Props) => (
  <FisioLayout preview="Seu link de acesso à FisioGO" title="Seu link de acesso" buttonLabel="Entrar na FisioGO" buttonUrl={confirmationUrl} footer="Se você não pediu este link, pode ignorar este email com tranquilidade.">
    <Text style={p}>Clique no botão abaixo para entrar na sua conta <strong>FisioGO</strong>. Este link expira em pouco tempo.</Text>
  </FisioLayout>
)
export default MagicLinkEmail
