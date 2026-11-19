import * as React from 'react'
import { Text } from '@react-email/components'
import { FisioLayout, p } from './layout'

interface Props { siteName: string; siteUrl: string; recipient: string; confirmationUrl: string; nome?: string | null }

export const SignupEmail = ({ confirmationUrl, nome }: Props) => (
  <FisioLayout preview="Confirme seu email para ativar sua conta FisioGO" title={nome ? `Olá, ${nome}!` : 'Olá!'} buttonLabel="Confirmar meu email" buttonUrl={confirmationUrl} footer="Se você não criou uma conta na FisioGO, pode ignorar este email com tranquilidade.">
    <Text style={p}>Somos da <strong>FisioGO</strong>. Que bom ter você por aqui! Falta só um passo pra ativar sua conta: confirme seu email clicando no botão abaixo.</Text>
  </FisioLayout>
)
export default SignupEmail
