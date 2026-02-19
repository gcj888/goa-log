import { useState } from 'react'

const SEND_EMAIL_URL = 'https://cabbages.info/.netlify/functions/send-email'
const TEST_EMAIL = 'gclarkjones@gmail.com'

export function sendTestEmailAction(props) {
  const { id, type, published } = props
  const [sending, setSending] = useState(false)

  if (type !== 'logEntry') return null

  return {
    label: sending ? 'Sending...' : 'Send Test Email',
    disabled: sending,
    onHandle: async () => {
      setSending(true)
      try {
        const res = await fetch(SEND_EMAIL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.SANITY_STUDIO_SEND_EMAIL_SECRET || ''}`,
          },
          body: JSON.stringify({ entryId: id, testEmail: TEST_EMAIL }),
        })

        const data = await res.json()

        if (res.ok) {
          alert(data.message || 'Test email sent!')
        } else {
          alert(`Error: ${data.error}`)
        }
      } catch (err) {
        alert(`Failed: ${err.message}`)
      } finally {
        setSending(false)
      }
    },
  }
}
