import * as React from 'react'
import { Text } from '@react-email/components'
import { FisioLayout, p } from './layout'

interface Props { siteName: string; confirmationUrl: string }

export const RecoveryEmail = ({ confirmationUrl }: Props) => (
  <FisioLayout preview="Redefina sua senha da FisioGO" title="Redefinir sua senha" buttonLabel="Criar nova senha" buttonUrl={confirmationUrl} footer="Se você não pediu para redefinir a senha, ignore este email — sua senha continua a mesma.">
    <Text style={p}>Recebemos um pedido para redefinir a senha da sua conta <strong>FisioGO</strong>. Clique no botão abaixo para criar uma nova senha.</Text>
  </FisioLayout>
)
export default RecoveryEmail
