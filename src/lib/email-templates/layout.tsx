import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components'

const font = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

interface LayoutProps {
  preview: string
  title: string
  children: React.ReactNode
  buttonLabel?: string
  buttonUrl?: string
  footer: string
}

export const FisioLayout = ({ preview, title, children, buttonLabel, buttonUrl, footer }: LayoutProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={{ margin: 0, padding: '32px 16px', backgroundColor: '#ffffff', fontFamily: font }}>
      <Container style={{ maxWidth: '480px', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <Section style={{ padding: '32px 32px 0', textAlign: 'center' as const }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#3b82f6', color: '#ffffff', fontSize: '20px', fontWeight: 700, lineHeight: '40px', textAlign: 'center' as const, fontFamily: font }}>F</div>
          <div style={{ marginTop: '12px', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>FisioGO</div>
        </Section>
        <Section style={{ padding: '24px 32px 0' }}>
          <Heading style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>{title}</Heading>
        </Section>
        <Section style={{ padding: '8px 32px 0' }}>{children}</Section>
        {buttonUrl && buttonLabel ? (
          <>
            <Section style={{ padding: '8px 32px 32px', textAlign: 'center' as const }}>
              <Button href={buttonUrl} style={{ display: 'inline-block', padding: '12px 28px', backgroundColor: '#3b82f6', color: '#ffffff', fontSize: '15px', fontWeight: 600, textDecoration: 'none', borderRadius: '10px' }}>{buttonLabel}</Button>
            </Section>
            <Section style={{ padding: '0 32px 32px' }}>
              <Text style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#94a3b8' }}>
                Se o botão não funcionar, copie e cole este link no seu navegador:<br />
                <Link href={buttonUrl} style={{ color: '#3b82f6', wordBreak: 'break-all' as const }}>{buttonUrl}</Link>
              </Text>
            </Section>
          </>
        ) : null}
        <Section style={{ padding: '20px 32px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Text style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: '#94a3b8', textAlign: 'center' as const }}>{footer}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const p = { margin: '0 0 16px', fontSize: '15px', lineHeight: '1.6', color: '#475569' }
