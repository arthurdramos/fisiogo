import * as React from 'react'
import { Text } from '@react-email/components'
import { FisioLayout, p } from './layout'

interface Props { siteName: string; oldEmail: string; email: string; newEmail: string; confirmationUrl: string }

export const EmailChangeEmail = ({ oldEmail, email, newEmail, confirmationUrl }: Props) => (
  <FisioLayout preview="Confirme a troca do seu email na FisioGO" title="Confirme seu novo email" buttonLabel="Confirmar troca de email" buttonUrl={confirmationUrl} footer="Se você não pediu esta troca, ignore este email e proteja sua conta trocando sua senha.">
    <Text style={p}>Você pediu para trocar o email da sua conta <strong>FisioGO</strong> de <strong>{oldEmail || email}</strong> para <strong>{newEmail}</strong>. Clique no botão abaixo para confirmar.</Text>
  </FisioLayout>
)
export default EmailChangeEmail
