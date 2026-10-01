const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyYhinLQ33jrgKXxO7UTXDrByFNAJi_bMZ501k3NUlluL1yqwap8q1T0nK-dHXZiDTG/exec'


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { name, phone, gov, address, notes, bundle, price, flavors, quantity } = req.body

  res.status(200).json({ result: 'success' })

  const params = new URLSearchParams({
    name: name || '',
    phone: phone || '',
    gov: gov || '',
    address: address || '',
    notes: notes || '',
    bundle: bundle || '',
    price: price || '',
    flavors: flavors || '-',
    quantity: quantity || '1',
  })
  fetch(`${SHEET_URL}?${params.toString()}`).catch(() => {})
}
