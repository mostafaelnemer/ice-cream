import { useState, useRef, useEffect } from 'react'
import { buildPurchaseMeta, getAddToCartEventId, getViewContentEventId, trackBrowserEventOnce } from './metaTracking'
import CountdownTimer from './components/CountdownTimer'
import { CheckCircle2, Phone, Mail } from 'lucide-react'
import logo from './assets/logo.png'
import heroIcecreamImg from './assets/icecream-vanilla.webp'
import heroKetobarImg from './assets/hero-ketobar-double-chocolate.webp'
import offerIcecreamImg from './assets/ice_cream.webp'
import offerKetoImg from './assets/keto.webp'
import iceVanilla from './assets/icecream-vanilla.webp'
import iceChocolate from './assets/icecream-chocolate.webp'
import iceStrawberry from './assets/icecream-strawberry.webp'
import icePistachio from './assets/icecream-pistachio.webp'
import iceBlueberry from './assets/icecream-blueberry.webp'
import iceCantaloupe from './assets/icecream-cantaloupe.webp'
import iceHazelnut from './assets/icecream-hazelnut.webp'
import iceMango from './assets/icecream-mango.webp'
import ketoAlmond from './assets/ketobar-almond.webp'
import ketoCoconut from './assets/ketobar-coconut.webp'
import ketoHazelnut from './assets/ketobar-hazelnut.webp'
import ketoPeanut from './assets/ketobar-peanut-butter.webp'
import './App.css'

// العروض النهائية:
// - آيس كريم: 5 قطع بـ 299 جنيه (بدل 375)
// - كيتو بار: 4 قطع بـ 250 جنيه (بدل 340)
// - مفيش شحن في الموقع — الكول سنتر هيتعامل

// ─── DATA ────────────────────────────────────────────────────────────────────

/** ملخص المنتجات — TODO: تحديث الأحجام النهائية أول ما التفاصيل تتبعت */
const PRODUCT_SIZES_LABEL = 'آيس كريم · كيتو بار'

/** نكهات الآيس كريم — من صور المنتجات (8 نكهات) */
const ICECREAM_FLAVORS = ['فانيليا', 'شوكولاتة', 'فراولة', 'مانجو', 'بلوبيري', 'فسدق', 'بندق', 'كنتالوب']

/** نكهات الكيتو بار — نهائية من المستخدم (29/09/2026) */
const KETO_BAR_FLAVORS = ['بندق', 'زبدة فول سوداني', 'دبل شوكولاتة', 'جوز هند', 'لوز']

const DELIVERY_HOURS_LABEL = 'التوصيل خلال ساعات من تأكيد الطلب'

/** ثقة الشراء — تظهر مرة واحدة أسفل العروض فقط */
const offerTrustBadges = [
  { icon: '💳', label: 'الدفع عند الاستلام' },
  { icon: '📞', label: 'تأكيد الطلب سريع' },
]

// بدون شحن في الموقع خالص — الكول سنتر هيتعامل
const calcItemsSubtotal = (items) =>
  items.reduce((sum, item) => sum + item.bundle.price * item.qty, 0)

/** total = مجموع المنتجات فقط */
const calcOrderTotal = (items) => calcItemsSubtotal(items)

// العرضان النهائيان فقط — بدون ميكس
// الأسعار من صور العروض: الآيس كريم 299 بدل 375 / الكيتو بار 250 بدل 340
// ملحوظة: مفيش شحن في الموقع — الكول سنتر هيتعامل
const bundles = [
  {
    id: 'icecream',
    name: 'عرض الآيس كريم',
    badge: '🍨 5 قطع بـ 299 ج',
    description: `آيس كريم Healthy & Tasty بدون سكر — 5 قطع تختار نكهاتهم بنفسك من 8 نكهات: ${ICECREAM_FLAVORS.join('، ')}`,
    price: 299,
    originalPrice: 375,
    saving: 76,
    units: 5,
    unitsLabel: '5 قطع',
    flavors: ICECREAM_FLAVORS,
    image: offerIcecreamImg,
    accent: '#EC4899',
  },
  {
    id: 'ketobar',
    name: 'عرض الكيتو بار',
    badge: '💪 4 قطع بـ 250 ج',
    description: `كيتو بار Healthy & Tasty — سناك بروتين من غير سكر · 4 قطع من 5 نكهات: ${KETO_BAR_FLAVORS.join('، ')}`,
    price: 250,
    originalPrice: 340,
    saving: 90,
    units: 4,
    unitsLabel: '4 قطع',
    flavors: KETO_BAR_FLAVORS,
    deliveryNote: '🚚 التوصيل مجاني',
    freeShipping: true,
    image: offerKetoImg,
    accent: '#10B981',
  },
]

/** الكيتو لوحده = شحنه مجاني. الآيس كريم ملوش أي كلام عن الشحن. */
const onlyKeto = (items) => items.length > 0 && items.every((item) => item.bundle.freeShipping)

/** عدد القطع الافتراضي لكل عرض — يُستخدم في توزيع النكهات */
const bundleUnits = (bundleId) => bundles.find((b) => b.id === bundleId)?.units ?? 5

/** إيموجي لكل نكهة — للعرض في الـ picker وشرايح الهيرو */
const FLAVOR_EMOJI = {
  'فانيليا': '🍦',
  'شوكولاتة': '🍫',
  'فراولة': '🍓',
  'مانجو': '🥭',
  'بلوبيري': '🫐',
  'فسدق': '💚',
  'بندق': '🌰',
  'كنتالوب': '🍈',
  'زبدة فول سوداني': '🥜',
  'دبل شوكولاتة': '🍫',
  'جوز هند': '🥥',
  'لوز': '🌰',
}

/** صورة كل نكهة للـ picker — منفصلين عشان "بندق" موجودة في النوعين بصورتين مختلفتين */
const ICECREAM_IMAGES = {
  'فانيليا': iceVanilla,
  'شوكولاتة': iceChocolate,
  'فراولة': iceStrawberry,
  'مانجو': iceMango,
  'بلوبيري': iceBlueberry,
  'فسدق': icePistachio,
  'بندق': iceHazelnut,
  'كنتالوب': iceCantaloupe,
}

const KETOBAR_IMAGES = {
  'بندق': ketoHazelnut,
  'زبدة فول سوداني': ketoPeanut,
  'دبل شوكولاتة': heroKetobarImg,
  'جوز هند': ketoCoconut,
  'لوز': ketoAlmond,
}

const bundleImages = (bundleId) => (bundleId === 'ketobar' ? KETOBAR_IMAGES : ICECREAM_IMAGES)

/** ملخص نصي: "2 فانيليا + 1 مانجو" — يتجاهل النكهات الصفرية */
const formatFlavorSummary = (names, values) =>
  names.map((n, i) => (values?.[i] > 0 ? `${values[i]} ${n}` : '')).filter(Boolean).join(' + ') || 'بدون تحديد'

/** طلب فشل إرساله سابقاً — يُعاد إرساله في الخلفية (بدون حظر الواجهة).
 *  يُمسح من التخزين عند نجاح أي إرسال لاحق. لا يُطلق أي حدث Pixel هنا. */
const flushPendingOrder = () => {
  try {
    const raw = localStorage.getItem('hc_failed_order')
    if (!raw) return
    const pending = JSON.parse(raw)
    if (!pending || !pending.url) return
    fetch(pending.url, { method: 'GET', mode: 'no-cors', keepalive: true })
      .then(() => {
        try { localStorage.removeItem('hc_failed_order') } catch { /* ignore */ }
      })
      .catch((err) => console.error('[Order] Background retry failed:', err))
  } catch { /* ignore */ }
}

/** مسودة الفورم في sessionStorage — عشان الرجوع من التأكيد يرجع ببياناته */
const draftSig = (list) => JSON.stringify((list || []).map((i) => ({ id: i.bundle.id, qty: i.qty })))

const loadFormDraft = (list) => {
  try {
    // v2: المسودات القديمة (الموزعة تلقائياً) تتجاهل — البيزنس طالب البدء من صفر
    localStorage.removeItem('hc_form_draft')
    const d = JSON.parse(sessionStorage.getItem('hc_form_draft_v2'))
    if (d && d.sig === draftSig(list)) return d
  } catch { /* ignore */ }
  return null
}

/** Hero — صياغة نهائية من المستخدم */
const heroPerks = [
  {label: 'بدون سكر' },
  {label: 'مناسب للكيتو' },
  {label: 'مناسب للدايت' },
  {label: 'الدفع عند الاستلام' },
]

/** صور شريط الهيرو المتحرك — 6 نكهات فقط (تتكرر مرة واحدة للحلقة السلسة = 12 صورة) */
const heroMarqueeItems = [
  { img: iceVanilla, name: 'فانيليا' },
  { img: iceStrawberry, name: 'فراولة' },
  { img: icePistachio, name: 'فسدق' },
  { img: heroKetobarImg, name: 'دبل شوكولاتة' },
  { img: ketoPeanut, name: 'فول سوداني' },
  { img: ketoCoconut, name: 'جوز هند' },
]

const benefitCards = [
  { icon: '🍦', title: 'آيس كريم بطعم تحبه', text: 'استمتع بطعم الآيس كريم اللي بتحبه، مع خيار مناسب لمتبعي الكيتو والأنظمة منخفضة السعرات.' },
  { icon: '💜', title: 'مناسب لنظامك', text: 'اختيارات تناسب يومك في الدايت — للحظات اللي نفسك فيها بحاجة مختلفة من غير ما تحس إن الدايت ممل.' },
  { icon: '🍫', title: 'كيتو بار عملي', text: 'سناك سريع بين الوجبات من Healthy & Tasty — تاخده معاك في الشغل، الجامعة أو الجيم.' },
  { icon: '🚚', title: 'طلب سهل', text: 'ادخل بياناتك — فريق Healthy & Tasty هيتواصل سريعاً للتأكيد، والدفع عند الاستلام.' },
]

const egyptGovs = ['القاهرة', 'الجيزة', 'الإسكندرية', 'طنطا', 'السويس', 'المنصورة', 'دمياط']

const faqs = [
  { q: 'الآيس كريم فيه سكر؟', a: 'لا، آيس كريم Healthy & Tasty بدون سكر، ومناسب لمتبعي الكيتو والأنظمة منخفضة السعرات.' },
  { q: 'الكيتو بار مناسب للكيتو؟', a: 'أيوه، الـ Keto Bar مصمم ليناسب نظام الكيتو، وعملي كسناك بين الوجبات تاخده معاك في الشغل أو الجامعة أو الجيم.' },
  { q: 'إيه العروض المتاحة؟', a: 'عرض الآيس كريم: 5 قطع بـ 299 جنيه بدلاً من 375. عرض الكيتو بار: 4 قطع بـ 250 جنيه بدلاً من 340 والتوصيل مجاني.' },
  { q: 'التوصيل بياخد قد إيه؟', a: 'فريق Healthy & Tasty بيتواصل سريعاً لتأكيد الطلب، والتوصيل يبدأ خلال ساعات بعد التأكيد.' },
  { q: 'الدفع إزاي؟', a: 'الدفع عند الاستلام.' },
  { q: 'أطلب إزاي؟', a: 'اختار العرض، أكمل بياناتك، وفريقنا هيتواصل معاك لتأكيد الطلب والتوصيل.' },
  // TODO: سياسة المنتج السايح/التالف — تُعرض فقط بعد استلام MELT_DAMAGE_POLICY من المستخدم
  // { q: 'لو المنتج وصل سايح أو تالف أعمل إيه؟', a: 'MELT_DAMAGE_POLICY' },
  // TODO: سياسة الاستبدال/إعادة الطلب — تُعرض فقط بعد استلام EXCHANGE_POLICY من المستخدم
  // { q: 'في استبدال أو إعادة طلب؟', a: 'EXCHANGE_POLICY' },
]

// سكريبت الطلبات الخاص بمشروع Healthy Icecream/Keto (شيت منفصل — updated 29/09/2026)
const ORDER_API_URL = 'https://script.google.com/macros/s/AKfycbyYhinLQ33jrgKXxO7UTXDrByFNAJi_bMZ501k3NUlluL1yqwap8q1T0nK-dHXZiDTG/exec'

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

const getFbc = () => {
  const existing = getCookie('_fbc')
  if (existing) return existing
  const fbclid = new URLSearchParams(window.location.search).get('fbclid')
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : ''
}

// ─── TRUST & ORDER UI HELPERS ────────────────────────────────────────────────

function OfferTrustPills() {
  return (
    <div className="trust-pills trust-pills--offers">
      {offerTrustBadges.map((b) => (
        <span key={b.label}>{b.icon} {b.label}</span>
      ))}
    </div>
  )
}

function DeliveryHighlight({ compact = false }) {
  return (
    <p className={`delivery-highlight ${compact ? 'delivery-highlight--compact' : ''}`} role="note">
      ⚡ {DELIVERY_HOURS_LABEL}
    </p>
  )
}

function OrderExpectationBox() {
  return (
    <div className="order-expectation" role="note">
      <p><strong>بعد إرسال الطلب:</strong> فريق Healthy & Tasty هيتواصل معاك سريعاً لتأكيد الطلب.</p>
      <p>التوصيل يبدأ مباشرة بعد التأكيد — ومعظم الطلبات تصل في نفس اليوم أو خلال ساعات حسب منطقتك.</p>
    </div>
  )
}

// ─── FLAVOR PICKER — vertical list with photos + counters ────────────────────
// كل نكهة سطر: صورتها + اسمها + زرار +/−. الـ state الخارجي counts array.

function FlavorPicker({ flavorNames, values, onChange, label, total, images, showHint = true }) {
  const names = flavorNames ?? []
  const vals = names.map((_, i) => values?.[i] ?? 0)
  const distributed = vals.reduce((s, v) => s + v, 0)
  const remaining = Math.max(0, total - distributed)

  const setVal = (i, v) => {
    const others = distributed - vals[i]
    const clamped = Math.max(0, Math.min(v, total - others))
    onChange(vals.map((x, idx) => (idx === i ? clamped : x)))
  }

  return (
    <div className="flavor-section">
      <div className="flavor-header">
        <h3 className="flavor-title">{label || 'اختار النكهات'}</h3>
        <span className="flavor-badge">{distributed}/{total} قطعة</span>
      </div>
      {showHint && (
        <p className="flavor-hint">
          دوس + على النكهات اللي تعجبك لحد ما تكمّل القطع
          {remaining > 0 ? ` — فاضل ${remaining} ${remaining === 1 ? 'قطعة' : 'قطع'} 👆` : ' — تمام، كل القطع متختارة ✔'}
        </p>
      )}
      <div className="flavor-rows">
        {names.map((name, i) => (
          <div key={name} className={`flavor-row ${vals[i] > 0 ? 'flavor-row--picked' : ''}`}>
            {images?.[name] ? (
              <img src={images[name]} alt={`نكهة ${name}`} className="flavor-row-img" loading="lazy" />
            ) : (
              <span className="flavor-row-emoji">{FLAVOR_EMOJI[name] ?? '😋'}</span>
            )}
            <span className="flavor-row-name">{name}</span>
            <div className="flavor-counter">
              <button type="button" className="fctr-btn" aria-label={`زيادة ${name}`} onClick={() => setVal(i, vals[i] + 1)} disabled={remaining === 0}>+</button>
              <span className="fctr-val">{vals[i]}</span>
              <button type="button" className="fctr-btn" aria-label={`تقليل ${name}`} onClick={() => setVal(i, vals[i] - 1)} disabled={vals[i] === 0}>−</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ORDER FORM ───────────────────────────────────────────────────────────────

function StepConfirm({ cartItems: initialItems, onBack }) {
  const [items, setItems] = useState(initialItems)
  // لو راجع من التأكيد (back) — رجّع مسودته بدل ما يبدأ من الصفر
  const savedDraft = loadFormDraft(initialItems)
  const [name, setName] = useState(savedDraft?.name ?? '')
  const [phone, setPhone] = useState(savedDraft?.phone ?? '')
  const [gov, setGov] = useState(savedDraft?.gov ?? '')
  const [address, setAddress] = useState(savedDraft?.address ?? '')
  const [notes, setNotes] = useState(savedDraft?.notes ?? '')
  const [status, setStatus] = useState('idle')
  // purchaseSubmitLock prevents re-entry during the async submit.
  // It is set to the eventId string (not just true) so we can detect
  // if a second call arrives with the same or a different eventId.
  const purchaseSubmitLock = useRef(false)
  const [touched, setTouched] = useState({})
  // index العرض اللي نكهاته ناقصة (يظهر تحته خطأ ويتعمله scroll)
  const [flavorErrorIdx, setFlavorErrorIdx] = useState(null)
  const [itemFlavors, setItemFlavors] = useState(() => {
    if (savedDraft && Array.isArray(savedDraft.itemFlavors) && savedDraft.itemFlavors.length === initialItems.length) {
      return savedDraft.itemFlavors
    }
    // البيزنس طالب: تبدأ كلها صفر والعميل يوزع بنفسه
    return initialItems.map(item => item.bundle.flavors.map(() => 0))
  })

  // احفظ مسودة أول بأول — الرجوع من التأكيد أو الـ refresh يرجع ببياناته
  useEffect(() => {
    try {
      sessionStorage.setItem('hc_form_draft_v2', JSON.stringify({
        sig: draftSig(items),
        itemFlavors, name, phone, gov, address, notes,
      }))
    } catch { /* ignore */ }
  }, [items, itemFlavors, name, phone, gov, address, notes])

  const removeItem = (i) => {
    setItems(prev => prev.filter((_, idx) => idx !== i))
    setItemFlavors(prev => prev.filter((_, idx) => idx !== i))
  }

  if (items.length === 0) {
    onBack()
    return null
  }

  const cartItems = items
  const subtotal = calcItemsSubtotal(cartItems)
  const totalPrice = calcOrderTotal(cartItems)

  const touch = (field) => setTouched(t => ({ ...t, [field]: true }))

  const errors = {
    name: !name.trim() ? 'الاسم مطلوب' : '',
    phone: !phone.trim() ? 'رقم الموبايل مطلوب' : !/^01[0-9]{9}$/.test(phone.trim()) ? 'رقم غير صحيح، مثال: 01XXXXXXXXX' : '',
    gov: !gov ? 'اختر محافظتك' : '',
    address: !address.trim() ? 'العنوان مطلوب' : address.trim().length < 10 ? 'اكتب العنوان بتفصيل أكتر' : '',
  }

  const buildOrderSummary = () =>
    cartItems.map((item, i) => {
      const summary = `${item.bundle.name} ×${item.qty} (${formatFlavorSummary(item.bundle.flavors, itemFlavors[i])})`
      return summary
    }).join(' | ')

  const buildOfferSummary = () =>
    cartItems.map((item) => `${item.bundle.name} ×${item.qty}`).join(' | ')

  const handleSubmit = async () => {
    // Guard 1: status-based lock (catches re-renders and rapid taps after completion)
    if (status === 'sending' || status === 'done') return
    // Guard 2: ref-based lock (catches rapid double-taps before state update propagates)
    if (purchaseSubmitLock.current) return

    setTouched({ name: true, phone: true, gov: true, address: true })
    setFlavorErrorIdx(null)
    const currentErrors = {
      name: !name.trim() ? 'الاسم مطلوب' : '',
      phone: !phone.trim() ? 'رقم الموبايل مطلوب' : !/^01[0-9]{9}$/.test(phone.trim()) ? 'رقم غير صحيح، مثال: 01XXXXXXXXX' : '',
      gov: !gov ? 'اختر محافظتك' : '',
      address: !address.trim() ? 'العنوان مطلوب' : address.trim().length < 10 ? 'اكتب العنوان بتفصيل أكتر' : '',
    }
    const firstError = Object.keys(currentErrors).find(k => currentErrors[k])
    if (firstError) {
      document.getElementById(`field-${firstError}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    // النكهات لازم تكمل عدد قطع كل عرض — اللي ميلمسش العدادات معفي (متوزعة مشكّل من الأول)
    const incompleteIdx = cartItems.findIndex((item, i) => {
      const need = bundleUnits(item.bundle.id) * item.qty
      const got = (itemFlavors[i] || []).reduce((s, v) => s + v, 0)
      return got < need
    })
    if (incompleteIdx !== -1) {
      setFlavorErrorIdx(incompleteIdx)
      setTimeout(() => {
        document.getElementById(`offer-block-${incompleteIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }

    // Set lock BEFORE any async work — prevents all re-entry paths
    purchaseSubmitLock.current = true
    setStatus('sending')

    // no-cors responses are opaque: only NETWORK failures (rejection) are detectable.
    const postOrder = (url) => fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true })

    // Shared failure path: no success screen, cart + draft stay intact.
    const failSubmit = (err) => {
      console.error('[Order] Submit failed:', err)
      purchaseSubmitLock.current = false // allow manual retry (new eventId per attempt)
      setStatus('failed')
      try {
        if (typeof window.fbq === 'function') window.fbq('trackCustom', 'OrderSubmitFailed')
      } catch { /* ignore */ }
      setTimeout(() => {
        document.getElementById('submit-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
    }

    let orderUrl = ''
    let eventId = ''
    try {
      const orderSummary = buildOrderSummary()
      const offerSummary = buildOfferSummary()

      // Build purchase meta ONCE per attempt — this generates the single eventId shared by
      // both the browser Pixel and the CAPI call. Never call buildPurchaseMeta()
      // twice for the same attempt.
      const purchaseMeta = buildPurchaseMeta({ value: totalPrice, contentName: offerSummary })
      const { eventName, eventTime, eventParams } = purchaseMeta
      eventId = purchaseMeta.eventId

      // Debug log — verify value/currency/event_id before any network call
      console.log('[Order] Purchase submit:', {
        event_name: eventName,
        event_id: eventId,
        value: eventParams.value,
        currency: eventParams.currency,
        typeof_value: typeof eventParams.value,
        totalPrice,
      })

      const orderPayload = new URLSearchParams({
        name,
        phone,
        gov,
        address,
        notes: notes || '',
        bundle: offerSummary,
        // الشيت: الإجمالي فقط — اتفاق 01/10/2026: شيلنا المنتجات/القيمة/الشحن/الوزن من الشيت
        price: `${totalPrice} ج.م`,
        value: String(totalPrice),          // للـ CAPI Purchase value — مش عمود في الشيت
        quantity: String(cartItems.reduce((s, i) => s + i.qty, 0)),
        flavors: orderSummary,
        eventName,
        eventTime: String(eventTime),
        eventId,                            // same id sent to CAPI server-side + reused on retry
        // Session-stable ids — Apps Script must attach the SAME ids to its ViewContent/AddToCart
        // CAPI events so Meta deduplicates them against the browser Pixel fires.
        viewContentEventId: getViewContentEventId(),
        addToCartEventId: getAddToCartEventId(),
        eventSourceUrl: window.location.href,
        fbp: getCookie('_fbp'),
        fbc: getFbc(),
        userAgent: navigator.userAgent,
      })

      // ── Sheet + CAPI (server-side) ──────────────────────────────────────────
      // كل طلب مؤكد لازم يتبعت — حتى لو اتعمل طلب قبل كده في نفس الجلسة
      // (العميل ممكن يطلب أكتر من مرة). منع التكرار لنفس الطلب مضمون بـ:
      // 1) purchaseSubmitLock + status guards (ضد الدوس المزدوج)
      // 2) eventId فريد لكل محاولة + capiAlreadySent() في السكريبت (ضد تكرار CAPI)
      // 3) trackBrowserEventOnce (ضد تكرار البكسل — يُستدعى عند النجاح فقط)
      orderUrl = `${ORDER_API_URL}?${orderPayload.toString()}`
      try {
        await postOrder(orderUrl)
      } catch (err1) {
        console.error('[Order] Submit attempt 1 failed, retrying once:', err1)
        await new Promise((r) => setTimeout(r, 1500))
        await postOrder(orderUrl) // throws → failure path below
      }

      // ── SUCCESS ─────────────────────────────────────────────────────────────
      try { localStorage.removeItem('hc_failed_order') } catch { /* ignore */ }

      // ── Browser Pixel (fires ONLY on success — never twice for one order) ──
      // trackBrowserEventOnce uses its own sessionStorage key per (eventName+eventId).
      // The eventID option MUST match the event_id sent to CAPI above.
      trackBrowserEventOnce(eventName, eventParams, eventId)

      window.history.pushState({}, '', '/confirmation_order')
      setStatus('done')
    } catch (err) {
      // Rejection here = network failure on both attempts (or payload build error).
      // Save payload (with its eventId) for background retry — do NOT show success.
      if (orderUrl) {
        try {
          localStorage.setItem('hc_failed_order', JSON.stringify({ url: orderUrl, eventId, ts: Date.now() }))
        } catch { /* ignore */ }
      }
      failSubmit(err)
    }
    // NOTE: purchaseSubmitLock stays true after success (blocks any re-fire for this
    // component instance). It is released ONLY in failSubmit() to allow a manual retry,
    // which builds a fresh eventId — so Pixel/CAPI can never double-fire one order.
  }

  if (status === 'done') {
    return (
      <div className="step-screen">
        <div className="order-success">
          <div className="success-anim">
            <div className="success-circle">
              <svg viewBox="0 0 52 52" className="success-svg">
                <circle cx="26" cy="26" r="25" fill="none" className="success-circle-bg" />
                <path d="M14 27l8 8 16-16" fill="none" className="success-check" />
              </svg>
            </div>
          </div>
          <h2>تم تسجيل طلبك!</h2>
          <p className="success-lead">سيتم التواصل معاك خلال وقت قصير لتأكيد الطلب.</p>
          <p className="success-lead success-lead--accent">التوصيل يبدأ خلال ساعات بعد التأكيد — ومعظم الطلبات تصل في نفس اليوم حسب المنطقة.</p>
          <DeliveryHighlight />
          <div className="success-card">
            <div className="success-card-row">
              <span className="success-label">المنتج</span>
              <span className="success-val">{PRODUCT_SIZES_LABEL}</span>
            </div>
            <div className="success-card-divider" />
            {cartItems.map((item, i) => {
              return (
                <div key={i}>
                  <div className="success-card-row">
                    <span className="success-label">{item.bundle.name}</span>
                    <span className="success-val">×{item.qty} — {item.bundle.price * item.qty} ج.م</span>
                  </div>
                  <div className="success-card-row">
                    <span className="success-label">النكهات</span>
                    <span className="success-val">{formatFlavorSummary(item.bundle.flavors, itemFlavors[i])}</span>
                  </div>
                  {i < cartItems.length - 1 && <div className="success-card-divider" />}
                </div>
              )
            })}
            <div className="success-card-divider" />
            <div className="success-card-row">
              <span className="success-label">المنتجات</span>
              <span className="success-val">{subtotal} ج.م</span>
            </div>
            {onlyKeto(cartItems) && (
              <div className="success-card-row">
                <span className="success-label">الشحن</span>
                <span className="success-val">مجاني 🚚</span>
              </div>
            )}
            <div className="success-card-row">
              <span className="success-label">الإجمالي</span>
              <span className="success-val price">{totalPrice} ج.م</span>
            </div>
            <div className="success-card-divider" />
            <div className="success-card-row">
              <span className="success-label">الاسم</span>
              <span className="success-val">{name}</span>
            </div>
            <div className="success-card-row">
              <span className="success-label">الموبايل</span>
              <span className="success-val">{phone}</span>
            </div>
            <div className="success-card-row">
              <span className="success-label">المحافظة</span>
              <span className="success-val">{gov}</span>
            </div>
          </div>
        </div>

        <button className="back-btn" style={{ marginTop: '12px' }} onClick={() => { window.history.pushState({}, '', '/'); onBack() }}>العودة للرئيسية</button>
      </div>
    )
  }

  return (
    <div className="step-screen">
      <div className="cart-summary-header">
        <span className="cart-summary-title">🛒 ملخص طلبك</span>
        <span className="cart-summary-total">{totalPrice} ج.م</span>
      </div>

      {cartItems.map((item, i) => (
        <div key={i} className="order-offer-block" id={`offer-block-${i}`}>
          {cartItems.length > 1 && (
            <h3 className="offer-index">العرض {i === 0 ? 'الأول' : 'الثاني'}</h3>
          )}
          <div className="confirm-summary">
            <button className="remove-item-btn" onClick={() => removeItem(i)} title="إزالة من السلة">✕</button>
            <div className="confirm-img">
              <img src={item.bundle.image} alt={`صورة ${item.bundle.name} في الطلب`} />
            </div>
            <div className="confirm-info">
              <h3>{item.bundle.name} · {item.bundle.unitsLabel}{item.qty > 1 ? ` × ${item.qty}` : ''}</h3>
              <div className="confirm-price">
                <strong>{item.bundle.price * item.qty} ج.م</strong>
                {item.bundle.originalPrice > item.bundle.price && (
                  <s>{item.bundle.originalPrice * item.qty} ج.م</s>
                )}
              </div>
              {item.bundle.deliveryNote && (
                <span className="confirm-shipping">{item.bundle.deliveryNote}</span>
              )}
            </div>
          </div>
          <FlavorPicker
            flavorNames={item.bundle.flavors}
            values={itemFlavors[i]}
            total={bundleUnits(item.bundle.id) * item.qty}
            images={bundleImages(item.bundle.id)}
            onChange={(v) => {
              setItemFlavors(prev => prev.map((x, idx) => idx === i ? v : x))
              if (flavorErrorIdx === i) setFlavorErrorIdx(null)
            }}
          />
          {flavorErrorIdx === i && (() => {
            const need = bundleUnits(item.bundle.id) * item.qty
            const got = (itemFlavors[i] || []).reduce((s, v) => s + v, 0)
            const rem = need - got
            return (
              <p className="field-msg error flavor-error" role="alert">
                ⚠️ كمّل نكهات {item.bundle.name} — فاضل {rem} {rem === 1 ? 'قطعة' : 'قطع'}
              </p>
            )
          })()}
        </div>
      ))}

      <div className="order-total-slim">
        <span>الإجمالي{onlyKeto(cartItems) ? ' · توصيل مجاني 🚚' : ''}</span>
        <strong>{totalPrice} ج.م</strong>
      </div>
      <div className="form-section">
        <h2>بيانات التوصيل</h2>
        <div className="form-card">
          <div className="field-row">
          <div id="field-name" className={`field ${touched.name && errors.name ? 'field-error' : touched.name && !errors.name ? 'field-ok' : ''}`}>
            <label>الاسم <span className="req">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} onBlur={() => touch('name')} placeholder="اكتب اسمك الكامل" />
            {touched.name && errors.name && <p className="field-msg error" role="alert">{errors.name}</p>}
          </div>
          <div id="field-phone" className={`field ${touched.phone && errors.phone ? 'field-error' : touched.phone && !errors.phone ? 'field-ok' : ''}`}>
            <label>رقم الموبايل <span className="req">*</span></label>
            <input value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => touch('phone')} placeholder="01XXXXXXXXX" type="tel" inputMode="numeric" maxLength={11} />
            {touched.phone && errors.phone && <p className="field-msg error" role="alert">{errors.phone}</p>}
          </div>
          </div>
          <div id="field-gov" className={`field ${touched.gov && errors.gov ? 'field-error' : touched.gov && !errors.gov ? 'field-ok' : ''}`}>
            <label>المحافظة <span className="req">*</span></label>
            <select value={gov} onChange={e => setGov(e.target.value)} onBlur={() => touch('gov')} className="select-field">
              <option value="">اختر محافظتك</option>
              {egyptGovs.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {touched.gov && errors.gov && <p className="field-msg error" role="alert">{errors.gov}</p>}
          </div>
          <div id="field-address" className={`field ${touched.address && errors.address ? 'field-error' : touched.address && !errors.address ? 'field-ok' : ''}`}>
            <label>العنوان بالتفصيل <span className="req">*</span></label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} onBlur={() => touch('address')} placeholder="المدينة / الشارع / رقم المنزل / أي تفاصيل تساعد في التوصيل" rows={3} />
            {touched.address && errors.address && <p className="field-msg error" role="alert">{errors.address}</p>}
          </div>
          <div className="field">
            <label>ملاحظات <span className="opt">(اختياري)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="أي ملاحظات إضافية على الطلب" rows={2} />
          </div>
        </div>
      </div>

      {status === 'failed' && (
        <div className="submit-error" id="submit-error" role="alert">
          <p><strong>حصلت مشكلة في إرسال الطلب 😕</strong></p>
          <p>اتأكد من الإنترنت ودوس حاول تاني — سلتك وبياناتك محفوظين.</p>
          <button className="confirm-order-btn" onClick={handleSubmit}>
            🔄 حاول تاني
          </button>
          <p className="submit-error-contact">
            أو كلمنا مباشرة: <a href="tel:+201100863802" dir="ltr">01100863802</a>
          </p>
        </div>
      )}
      <button className="confirm-order-btn" onClick={handleSubmit} disabled={status === 'sending'}>
        {status === 'sending' ? '⏳ جاري تسجيل الطلب…' : `تأكيد الطلب • ${totalPrice} ج.م`}
      </button>
      <button className="back-btn" onClick={onBack}>رجوع</button>
    </div>
  )
}

// ─── LANDING (SCROLL PAGE) ───────────────────────────────────────────────────

function Landing({ onConfirm }) {
  const [openFaq, setOpenFaq] = useState(null)
  const [cart, setCart] = useState({})
  // Prevents AddToCart from firing twice if both checkout buttons are tapped
  // rapidly, or if onConfirm is called before the flow state transitions.
  const checkoutLock = useRef(false)

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0)
  const cartItems = bundles
    .filter(b => (cart[b.id] || 0) > 0)
    .map(b => ({ bundle: b, qty: cart[b.id] }))
  const cartCheckoutTotal = calcOrderTotal(cartItems)

  const addToCart = (bundleId) => setCart(c => ({ ...c, [bundleId]: (c[bundleId] || 0) + 1 }))
  const setQty = (bundleId, val) => {
    if (val <= 0) {
      setCart(c => { const n = { ...c }; delete n[bundleId]; return n })
    } else {
      setCart(c => ({ ...c, [bundleId]: val }))
    }
  }

  const handleCheckout = () => {
    if (checkoutLock.current) return
    const items = bundles
      .filter(b => (cart[b.id] || 0) > 0)
      .map(b => ({ bundle: b, qty: cart[b.id] }))
    if (items.length === 0) return
    checkoutLock.current = true
    onConfirm(items)
  }

  const scrollToBundles = () => document.getElementById('offers')?.scrollIntoView({ behavior: 'smooth' })

  // الرابط يتحرك مع السكرول: كل قسم يظهر يحدّث الـ hash فوق
  useEffect(() => {
    const spy = [
      { id: 'top', url: '/' },
      { id: 'offers', url: '#offers' },
      { id: 'benefits-section', url: '#benefits-section' },
      { id: 'faq', url: '#faq' },
    ]
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const match = spy.find((s) => s.id === e.target.id)
            if (match && window.location.pathname === '/') {
              window.history.replaceState({}, '', match.url)
            }
          }
        })
      },
      { rootMargin: '-40% 0px -55% 0px' }
    )
    spy.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  return (
    <div className={`landing ${cartCount > 0 ? 'landing--has-cart' : ''}`}>

      {/* STICKY CART BAR */}
      {cartCount > 0 && (
        <div className="sticky-cart-bar">
          <div className="sticky-cart-items">
            {bundles.filter(b => (cart[b.id] || 0) > 0).map(b => (
              <span key={b.id} className="sticky-cart-chip" style={{ '--accent': b.accent }}>
                {b.name} ×{cart[b.id]}
              </span>
            ))}
          </div>
          <button className="sticky-cart-btn" onClick={handleCheckout}>
            أكمل الطلب — {cartCheckoutTotal} ج.م {onlyKeto(cartItems) ? '· توصيل مجاني 🚚' : ''} ←
          </button>
        </div>
      )}

      <div className="promo-bar">
        <span>💳 الدفع عند الاستلام</span>
        <span className="promo-dot">•</span>
        <span>⚡ التوصيل خلال ساعات من تأكيد الطلب</span>
        <span className="promo-dot">•</span>
        <span>بدون سكر 🤍</span>
        <span className="promo-dot">•</span>
        <CountdownTimer variant="bar" />
      </div>

      <header className="topbar">
        <img src={logo} alt="Healthy & Tasty" className="topbar-logo" />
        <nav className="topbar-nav" aria-label="أقسام الصفحة">
          <a href="#offers">العروض</a>
          <a href="#benefits-section">ليه Healthy &amp; Tasty</a>
          <a href="#faq">الأسئلة الشائعة</a>
        </nav>
        <div className="topbar-actions">
          <button type="button" className="topbar-cta" onClick={scrollToBundles}>
            اطلب الآن 🛒
          </button>
        </div>
      </header>

      <section className="hero hero-v3" id="top">
        <div className="hero-v3-text">
          <p className="eyebrow-pill">Healthy &amp; Tasty • بدون سكر 🤍</p>
          <h1>
            نفسك في حاجة حلوة…
            <span> من غير ما تبوّظ الدايت؟</span>
          </h1>
          <p className="hero-sub">
            آيس كريم بدون سكر بـ 8 نكهات، وكيتو بار مشبّع بـ 5 نكهات —
            اختار نكهاتك بنفسك، وادفع عند الاستلام.
          </p>

          <div className="perks-wrap">
            {heroPerks.map((f) => (
              <span className="perk" key={f.label}>
                <CheckCircle2 size={16} /> {f.label}
              </span>
            ))}
          </div>
          <div className="hero-btns">
            <button type="button" className="primary-btn" onClick={scrollToBundles}>
              🛒 اطلب عرضك دلوقتي
            </button>
          </div>
          <DeliveryHighlight />
        </div>

        <div className="hero-v3-visual" aria-label="تشكيلة منتجات Healthy and Tasty">
          <div className="hero-blob hero-blob--berry" aria-hidden="true" />
          <div className="hero-blob hero-blob--mint" aria-hidden="true" />
          <div className="hero-stage">
            <img src={iceVanilla} alt="آيس كريم فانيليا بدون سكر" className="hero-main-img" fetchPriority="high" loading="eager" decoding="async" />
            <span className="hero-float-tag hero-float-tag--pink">🍨 8 نكهات آيس كريم</span>
            <span className="hero-float-tag hero-float-tag--green">🍫 5 نكهات كيتو بار</span>
            <span className="hero-float-tag hero-float-tag--white">بدون سكر ✓</span>
            <img src={iceStrawberry} alt="آيس كريم فراولة" className="hero-orbit hero-orbit--1" loading="lazy" />
            <img src={icePistachio} alt="آيس كريم فسدق" className="hero-orbit hero-orbit--2" loading="lazy" />
            <img src={iceChocolate} alt="آيس كريم شوكولاتة" className="hero-orbit hero-orbit--3" loading="lazy" />
            <img src={heroKetobarImg} alt="كيتو بار دبل شوكولاتة" className="hero-orbit hero-orbit--4" loading="lazy" />
            <img src={ketoPeanut} alt="كيتو بار زبدة فول سوداني" className="hero-orbit hero-orbit--5" loading="lazy" />
            <img src={iceBlueberry} alt="آيس كريم بلوبيري" className="hero-orbit hero-orbit--6" loading="lazy" />
          </div>
          <div className="hero-proof-chip">
            <span>🍨 8 نكهات آيس كريم + 🍫 5 نكهات كيتو بار</span>
            <small>اختار النكهات بنفسك عند الطلب</small>
          </div>
        </div>

        <div className="hero-marquee" aria-label="كل النكهات المتاحة">
          <div className="hero-marquee-track">
            {[...heroMarqueeItems, ...heroMarqueeItems].map((m, i) => (
              <span key={i} className="hero-marquee-item">
                <img src={m.img} alt={`نكهة ${m.name}`} loading="lazy" decoding="async" />
                <em>{m.name}</em>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section dark-section" id="offers">
        <div className="section-head light">
          <p className="eyebrow-pill light">عرضان فقط 👇 اختار اللي يناسبك</p>
          <h2>الباقة المناسبة ليك</h2>
          <p>الدفع عند الاستلام 💳 · 🍫 الكيتو بار توصيله مجاني</p>
          <DeliveryHighlight compact />
        </div>
        <CountdownTimer variant="offers" />
        <div className="bundle-list">
          {bundles.map((bundle) => {
            const qty = cart[bundle.id] || 0
            const inCart = qty > 0
            const selectBundle = () => {
              if (!inCart) addToCart(bundle.id)
            }

            return (
              <div
                key={bundle.id}
                role="button"
                tabIndex={0}
                aria-pressed={inCart}
                aria-label={`${bundle.name}${inCart ? ' — مختار في السلة' : ' — اضغط لاختيار العرض'}`}
                className={`bundle-row bundle-row-${bundle.id} ${inCart ? 'selected' : ''}`}
                style={{ '--accent': bundle.accent }}
                onClick={selectBundle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    selectBundle()
                  }
                }}
              >
                {inCart && <div className="selected-check">✓</div>}
                {bundle.badge && <div className="bundle-row-badge">{bundle.badge}</div>}
                <div className="bundle-row-img">
                  <img src={bundle.image} width="1254" height="1254" alt={`صورة ${bundle.name} — Healthy & Tasty`} loading="lazy" />
                </div>
                <div className="bundle-row-info">
                  <h3>{bundle.name}</h3>
                  <p>{bundle.description}</p>
                  <p className="bundle-row-note">{bundle.note}</p>
                  {bundle.deliveryNote && (
                    <p className={`delivery-tag ${bundle.freeShipping ? 'delivery-tag--free' : 'delivery-tag--paid'}`}>
                      {bundle.deliveryNote}
                    </p>
                  )}
                  <div className="bundle-row-price">
                    <strong>{bundle.price * Math.max(qty, 1)} ج.م</strong>
                    <s>{bundle.originalPrice * Math.max(qty, 1)} ج.م</s>
                    <span className="saving-tag">وفر {bundle.saving * Math.max(qty, 1)} ج.م</span>
                  </div>
                  <div className="bundle-row-actions" onClick={e => e.stopPropagation()}>
                    {inCart ? (
                      <div className="bundle-qty">
                        <button type="button" className="qty-btn" aria-label="تقليل الكمية" onClick={() => setQty(bundle.id, qty - 1)}>−</button>
                        <span className="qty-val">{qty}</span>
                        <button type="button" className="qty-btn" aria-label="زيادة الكمية" onClick={() => setQty(bundle.id, qty + 1)}>+</button>
                      </div>
                    ) : (
                      <button type="button" className="add-to-cart-btn" onClick={() => addToCart(bundle.id)}>
                        🛒 أضف للسلة
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <OfferTrustPills />
        {cartCount > 0 && (
          <button type="button" className="next-btn landing-next-btn" onClick={handleCheckout}>
            أكمل الطلب ({cartCount} {cartCount === 1 ? 'عرض' : 'عروض'} — {cartCheckoutTotal} ج.م{onlyKeto(cartItems) ? ' · التوصيل مجاني 🚚' : ''}) ←
          </button>
        )}
      </section>

      <section className="section" id="benefits-section">
        <div className="section-head">
          <p className="eyebrow-pill">ليه Healthy & Tasty؟</p>
          <h2>اختيارات تناسب نظامك خلال اليوم</h2>
          <p>آيس كريم · كيتو بار — بدون سكر، مناسب لمتبعي الكيتو والأنظمة منخفضة السعرات.</p>
        </div>
        <div className="benefit-grid">
          {benefitCards.map((b) => (
            <div className="benefit-card" key={b.title}>
              <span className="benefit-icon">{b.icon}</span>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section dark-section">
        <div className="section-head light">
          <p className="eyebrow-pill light">الطلب بسيط</p>
          <h2>3 خطوات وتستلم عرضك</h2>
        </div>
        <div className="steps-grid">
          {[
            { n: '1', title: 'اختار العرض', text: 'حدد الباقة المناسبة ليك واختار النكهات بسهولة.' },
            { n: '2', title: 'ادخل بياناتك', text: 'اسمك وعنوانك — فريق Healthy & Tasty هيتواصل سريعاً للتأكيد.' },
            { n: '3', title: 'استلم خلال ساعات', text: 'التوصيل يبدأ بعد التأكيد — ومعظم الطلبات تصل في نفس اليوم حسب المنطقة.' },
          ].map((s) => (
            <div className="step-card" key={s.n}>
              <span className="step-num">{s.n}</span>
              <div className="step-card-text">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="faq">
        <div className="section-head">
          <p className="eyebrow-pill">الأسئلة الشائعة</p>
          <h2>كل اللي محتاج تعرفه قبل الطلب</h2>
        </div>
        <div className="faq-list">
          {faqs.map((item, i) => (
            <div className={`faq-item ${openFaq === i ? 'open' : ''}`} key={i}>
              <button
                type="button"
                className="faq-q"
                aria-expanded={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{item.q}</span>
                <span className="faq-arrow" aria-hidden="true">{openFaq === i ? '▲' : '▼'}</span>
              </button>
              {openFaq === i && <p className="faq-a">{item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      <CountdownTimer variant="floating" />

      <footer className="footer">
        <img src={logo} alt="شعار Healthy and Tasty" className="footer-logo" />
        <div className="footer-links">
          <a href="tel:+201100863802"><Phone size={16} /> اتصال</a>
          <a href="mailto:care@healthyandtasty.store"><Mail size={16} /> إيميل</a>
        </div>
      </footer>
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

function App() {
  const [flow, setFlow] = useState('landing')
  const [cartItems, setCartItems] = useState([])
  // Prevents AddToCart pixel from firing more than once per page session
  const addToCartSentRef = useRef(false)

  // مرجع للسلة عشان الـ popstate يشوفها من غير ما يعيد الاشتراك
  const cartRef = useRef(cartItems)
  cartRef.current = cartItems

  const persistCart = (list) => {
    try {
      sessionStorage.setItem('hc_cart', JSON.stringify(list.map((i) => ({ id: i.bundle.id, qty: i.qty }))))
    } catch { /* ignore */ }
  }

  const clearDrafts = () => {
    try {
      sessionStorage.removeItem('hc_cart')
      sessionStorage.removeItem('hc_form_draft')
      sessionStorage.removeItem('hc_form_draft_v2')
    } catch { /* ignore */ }
  }

  const goHome = () => {
    clearDrafts()
    setFlow('landing')
    window.history.pushState({}, '', '/')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // Refresh على رابط خطوة يرجّع السلة + الرجوع/التقدم يمشي مع الخطوات والعنوان
  useEffect(() => {
    const restoreCart = () => {
      try {
        const saved = JSON.parse(sessionStorage.getItem('hc_cart'))
        if (Array.isArray(saved) && saved.length) {
          const restored = saved
            .map((s) => {
              const b = bundles.find((x) => x.id === s.id)
              return b ? { bundle: b, qty: Math.max(1, s.qty | 0) } : null
            })
            .filter(Boolean)
          if (restored.length) return restored
        }
      } catch { /* ignore */ }
      return null
    }

    const path = window.location.pathname
    if (path === '/add_to_cart' || path === '/confirmation_order') {
      const restored = restoreCart()
      if (restored) {
        setCartItems(restored)
        setFlow('form')
        // شاشة النجاح نفسها مش بتتخزن — ارجع لخطوة السلة ببياناتها
        if (path === '/confirmation_order') {
          window.history.replaceState({}, '', '/add_to_cart')
        }
      } else {
        window.history.replaceState({}, '', '/')
      }
    }

    const onPop = () => {
      const p = window.location.pathname
      if ((p === '/add_to_cart' || p === '/confirmation_order') && cartRef.current.length > 0) {
        // راجع من التأكيد → ارجع لصفحة السلة (مش الهوم) ببياناتها المحفوظة
        setFlow('form')
        window.scrollTo({ top: 0 })
        if (p === '/confirmation_order') {
          window.history.replaceState({}, '', '/add_to_cart')
        }
      } else {
        setFlow('landing')
        if (p !== '/') window.history.replaceState({}, '', '/')
      }
    }
    window.addEventListener('popstate', onPop)
    // طلب سابق فشل إرساله؟ حاول في الخلفية عند الفتح أو رجوع الإنترنت
    flushPendingOrder()
    window.addEventListener('online', flushPendingOrder)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('online', flushPendingOrder)
    }
  }, [])

  // ViewContent exactly once per session — the SAME event_id is sent to CAPI
  // in the order payload (viewContentEventId) so Meta can deduplicate the pair.
  useEffect(() => {
    const viewContentEventId = getViewContentEventId()
    console.log('[MetaPixel] ViewContent:', { event_id: viewContentEventId })
    trackBrowserEventOnce(
      'ViewContent',
      { content_type: 'product', content_name: 'Healthy & Tasty — العروض' },
      viewContentEventId,
    )
  }, [])

  if (flow === 'landing') {
    return (
      <Landing
        onConfirm={(items) => {
          setCartItems(items)
          persistCart(items)
          setFlow('form')
          window.scrollTo({ top: 0, behavior: 'instant' })
          window.history.pushState({}, '', '/add_to_cart')

          // Fire AddToCart pixel exactly once per session
          if (!addToCartSentRef.current) {
            addToCartSentRef.current = true
            const addToCartValue = calcOrderTotal(items)
            // Session-stable id — the SAME id is sent to CAPI in the order payload (addToCartEventId)
            const addToCartEventId = getAddToCartEventId()
            console.log('[MetaPixel] AddToCart:', {
              value: addToCartValue,
              currency: 'EGP',
              event_id: addToCartEventId,
            })
            trackBrowserEventOnce(
              'AddToCart',
              {
                value: addToCartValue,
                currency: 'EGP',
                content_type: 'product',
              },
              addToCartEventId,
            )
          }
        }}
      />
    )
  }

  return (
    <main className="funnel" dir="rtl" lang="ar">
      <div className="funnel-header">
        <button type="button" className="funnel-back-btn" onClick={goHome}>
          &#8594; رجوع
        </button>
        <img src={logo} alt="Healthy &amp; Tasty" className="topbar-logo" />
      </div>
      <StepConfirm
        cartItems={cartItems}
        onBack={goHome}
      />
    </main>
  )
}

export default App
