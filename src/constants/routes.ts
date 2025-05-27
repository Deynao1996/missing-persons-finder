import { WebsiteForSearch } from '../types'

const UNITY_STRENGTH_ROUTES = [
  '/',
  // '/gumanitarna-dopomoga-lyudyam-zi-skrutnym-zhyttyevym-stanovyshhem/',
  // '/emergency-response-team/',
  // '/evakuacziya-z-deokupovanyh-terytorij-abo-tyh-shho-znahodyatsya-v-zoni-bojovyh-dij/',
  // '/generatory-zarady-vyzhyvannya-ta-vidnovlennya/',
  // '/dystrybutsiia/',
  // '/ostrivecz-dytynstva-rozvytok-ditej-v-pryfrontovyh-terytoriyah/',
  // '/kutochky-zhyttya-v-harkivskij-oblasti-punkty-obigrivu/',
  // '/oblashtuvannya-bomboshovyshh-v-zoni-bojovyh-dij/',
  // '/vidbudova-kamyanky/',
  // '/warm-uteplennya-poshkodzhenyh-zhytlovyh-budynkiv-u-chervonij-zoni/',
  // '/statutni-dokumenty/',
  // '/pro-nas/',
  // '/zbir-pozhertv/',
  '/kontakty/',
]

const UNITY_VERCEL_ROUTES = ['/faq', '/about']

export const SEARCHING_WEBSITES = [
  {
    baseUrl: 'https://www.unityandstrength.in.ua',
    routes: UNITY_STRENGTH_ROUTES,
    backgroundSelectors: ['.swiper-slide-bg', '.elementor-carousel-image'],
  },
  {
    baseUrl: 'https://unity-and-strength.vercel.app',
    routes: UNITY_VERCEL_ROUTES,
  },
] satisfies WebsiteForSearch[]
