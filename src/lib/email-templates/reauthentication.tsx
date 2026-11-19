import * as React from 'react'
import { Text } from '@react-email/components'
import { FisioLayout, p } from './layout'

interface Props { token: string }

export const ReauthenticationEmail = ({ token }: Props) => (
  <FisioLayout preview="Seu código de verificação da FisioGO" title="Seu código de verificação" footer="Se você não pediu este código, pode ignorar este email com tranquilidade.">
    <Text style={p}>Use o código abaixo para confirmar sua identidade na <strong>FisioGO</strong>:</Text>
    <Text style={{ margin: '0 0 32px', fontSize: '28px', fontWeight: 700, letterSpacing: '6px', color: '#3b82f6', textAlign: 'center' as const }}>{token}</Text>
  </FisioLayout>
)
export default ReauthenticationEmail
