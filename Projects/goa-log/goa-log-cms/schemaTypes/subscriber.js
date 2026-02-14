export default {
  name: 'subscriber',
  title: 'Subscriber',
  type: 'document',
  fields: [
    {
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: Rule => Rule.required().regex(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        { name: 'email', invert: false }
      ),
    },
    {
      name: 'subscribedAt',
      title: 'Subscribed At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      readOnly: true
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Unsubscribed', value: 'unsubscribed' },
        ],
        layout: 'radio'
      },
      initialValue: 'active'
    }
  ],
  preview: {
    select: {
      title: 'email',
      subtitle: 'status'
    }
  }
}
