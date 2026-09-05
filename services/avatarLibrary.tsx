import React from 'react';

export interface CartoonAvatar {
  id: string;
  name: string;
  category: 'professional' | 'characters' | 'animals';
  emojiMatch: string[]; // Emojis that automatically map to this cartoon
  render: (props?: { className?: string }) => React.ReactElement;
}

export const CARTOON_AVATARS: CartoonAvatar[] = [
  // 1. Businessman (นักธุรกิจสุดสมาร์ท)
  {
    id: 'businessman',
    name: 'นักธุรกิจสุดสมาร์ท',
    category: 'professional',
    emojiMatch: ['👨‍💼', '🧑‍💼', '💼', '👔'],
    render: ({ className = "w-full h-full" } = {}) => (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#EEF2FF" stroke="#312E81" strokeWidth="2.5"/>
        {/* Body & Navy Suit */}
        <path d="M22 96 C22 75 33 67 50 67 C67 67 78 75 78 96 Z" fill="#1E1B4B" stroke="#0F172A" strokeWidth="2.5"/>
        {/* White Shirt Collar */}
        <polygon points="50,70 41,64 45,82 50,86 55,82 59,64" fill="#FFFFFF"/>
        {/* Red Tie */}
        <polygon points="48,72 52,72 54,77 50,94 46,77" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5"/>
        <polygon points="47,70 53,70 52,75 48,75" fill="#DC2626"/>
        {/* Neck */}
        <rect x="44" y="58" width="12" height="11" rx="4" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5"/>
        {/* Head */}
        <ellipse cx="50" cy="42" rx="19" ry="21" fill="#FDE68A" stroke="#D97706" strokeWidth="2.5"/>
        {/* Ears */}
        <circle cx="30" cy="44" r="5" fill="#FCD34D" stroke="#D97706" strokeWidth="2"/>
        <circle cx="70" cy="44" r="5" fill="#FCD34D" stroke="#D97706" strokeWidth="2"/>
        {/* Hair - Stylish Blonde / Light Brown */}
        <path d="M30 40 C28 26 38 16 50 16 C63 16 72 25 70 39 C66 32 60 30 54 32 C48 30 42 29 36 33 C33 35 31 38 30 40 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="2.5"/>
        <path d="M38 23 C43 18 52 17 58 20" stroke="#FEF3C7" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Cheeks */}
        <ellipse cx="39" cy="47" rx="3.5" ry="2" fill="#F87171" opacity="0.6"/>
        <ellipse cx="61" cy="47" rx="3.5" ry="2" fill="#F87171" opacity="0.6"/>
        {/* Eyes */}
        <ellipse cx="43" cy="42" rx="3" ry="3.5" fill="#1E293B"/>
        <circle cx="44" cy="41" r="1.2" fill="#FFFFFF"/>
        <ellipse cx="57" cy="42" rx="3" ry="3.5" fill="#1E293B"/>
        <circle cx="58" cy="41" r="1.2" fill="#FFFFFF"/>
        {/* Eyebrows */}
        <path d="M39 36 Q43 33 47 36" stroke="#92400E" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M53 36 Q57 33 61 36" stroke="#92400E" strokeWidth="2" strokeLinecap="round" fill="none"/>
        {/* Smile */}
        <path d="M45 49 Q50 54 55 49" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      </svg>
    )
  },

  // 2. Superhero (ซูเปอร์ฮีโร่ผู้พิทักษ์)
  {
    id: 'superhero',
    name: 'ซูเปอร์ฮีโร่ผู้พิทักษ์',
    category: 'characters',
    emojiMatch: ['🦸‍♂️', '🦸', '🦸‍♀️', '⚡', '🦸‍♂️'],
    render: ({ className = "w-full h-full" } = {}) => (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#FEF2F2" stroke="#991B1B" strokeWidth="2.5"/>
        {/* Red Cape Behind */}
        <path d="M18 64 Q14 84 22 96 L78 96 Q86 84 82 64 Q50 72 18 64 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="2.5"/>
        {/* Hero Suit */}
        <path d="M25 96 C25 76 34 68 50 68 C66 68 75 76 75 96 Z" fill="#2563EB" stroke="#1E40AF" strokeWidth="2.5"/>
        {/* Gold Emblem on Chest */}
        <polygon points="50,73 54,81 63,81 56,87 59,95 50,90 41,95 44,87 37,81 46,81" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2"/>
        {/* Neck */}
        <rect x="44" y="58" width="12" height="11" rx="3" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5"/>
        {/* Head */}
        <ellipse cx="50" cy="42" rx="19" ry="21" fill="#FDE68A" stroke="#D97706" strokeWidth="2.5"/>
        {/* Hair - Stylish Hero Golden Hair */}
        <path d="M29 38 C28 23 37 14 50 14 C63 14 72 23 71 38 C67 30 58 29 53 31 C47 28 40 28 35 32 C32 34 30 36 29 38 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="2.5"/>
        <path d="M47 14 Q53 8 59 15" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" fill="none"/>
        {/* Hero Eye Mask - Magenta/Red */}
        <path d="M33 42 C33 36 44 36 48 40 C49 41 51 41 52 40 C56 36 67 36 67 42 C67 47 57 48 51 44 C49 43 47 43 45 44 C39 48 33 47 33 42 Z" fill="#E11D48" stroke="#9F1239" strokeWidth="2"/>
        {/* Mask Eye Holes */}
        <ellipse cx="42" cy="41" rx="4" ry="3.5" fill="#FFFFFF"/>
        <circle cx="43" cy="41" r="2.2" fill="#0F172A"/>
        <circle cx="44" cy="40" r="0.8" fill="#FFFFFF"/>
        <ellipse cx="58" cy="41" rx="4" ry="3.5" fill="#FFFFFF"/>
        <circle cx="59" cy="41" r="2.2" fill="#0F172A"/>
        <circle cx="60" cy="40" r="0.8" fill="#FFFFFF"/>
        {/* Confident Smile */}
        <path d="M44 50 Q50 56 56 50" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      </svg>
    )
  },

  // 3. Businesswoman (นักธุรกิจหญิงเก่ง)
  {
    id: 'businesswoman',
    name: 'นักธุรกิจหญิงเก่ง',
    category: 'professional',
    emojiMatch: ['👩‍💼', '👩', '👗'],
    render: ({ className = "w-full h-full" } = {}) => (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#FFF1F2" stroke="#BE123C" strokeWidth="2.5"/>
        {/* Blazer */}
        <path d="M22 96 C22 75 32 67 50 67 C68 67 78 75 78 96 Z" fill="#E11D48" stroke="#9F1239" strokeWidth="2.5"/>
        {/* Inner Silk Blouse */}
        <polygon points="50,68 41,74 46,96 54,96 59,74" fill="#FFFFFF"/>
        {/* Pearl Necklace */}
        <path d="M44 68 Q50 74 56 68" stroke="#FDE68A" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 3" fill="none"/>
        {/* Neck */}
        <rect x="45" y="56" width="10" height="12" rx="3" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5"/>
        {/* Hair Back */}
        <path d="M27 45 C27 65 33 72 37 73 L63 73 C67 72 73 65 73 45 Z" fill="#78350F"/>
        {/* Head */}
        <ellipse cx="50" cy="42" rx="18" ry="20" fill="#FDE68A" stroke="#D97706" strokeWidth="2.5"/>
        {/* Cute Earrings */}
        <circle cx="31" cy="46" r="2.5" fill="#F59E0B"/>
        <circle cx="69" cy="46" r="2.5" fill="#F59E0B"/>
        {/* Hair Front - Chic Side-Swept */}
        <path d="M28 38 C28 23 37 14 50 14 C63 14 72 23 72 38 C68 28 58 26 48 30 C38 34 32 30 28 38 Z" fill="#92400E" stroke="#78350F" strokeWidth="2.5"/>
        {/* Rosy Cheeks */}
        <ellipse cx="38" cy="47" rx="3.5" ry="2" fill="#FB7185" opacity="0.6"/>
        <ellipse cx="62" cy="47" rx="3.5" ry="2" fill="#FB7185" opacity="0.6"/>
        {/* Eyes with Eyelashes */}
        <ellipse cx="42" cy="42" rx="3" ry="3.5" fill="#1E293B"/>
        <circle cx="43" cy="41" r="1.2" fill="#FFFFFF"/>
        <path d="M39 39 L37 37" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round"/>
        <ellipse cx="58" cy="42" rx="3" ry="3.5" fill="#1E293B"/>
        <circle cx="59" cy="41" r="1.2" fill="#FFFFFF"/>
        <path d="M61 39 L63 37" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round"/>
        {/* Smile */}
        <path d="M45 49 Q50 54 55 49" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      </svg>
    )
  },

  // 4. Tech Coder / Hacker (โปรแกรมเมอร์ไอที)
  {
    id: 'programmer',
    name: 'โปรแกรมเมอร์ไอที',
    category: 'professional',
    emojiMatch: ['🧑‍💻', '💻', '👨‍💻', '👩‍💻'],
    render: ({ className = "w-full h-full" } = {}) => (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#ECFDF5" stroke="#047857" strokeWidth="2.5"/>
        {/* Hoodie */}
        <path d="M22 96 C22 75 33 68 50 68 C67 68 78 75 78 96 Z" fill="#065F46" stroke="#022C22" strokeWidth="2.5"/>
        <path d="M40 70 L50 84 L60 70" stroke="#34D399" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        {/* Neck */}
        <rect x="44" y="58" width="12" height="11" rx="3" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5"/>
        {/* Head */}
        <ellipse cx="50" cy="43" rx="19" ry="20" fill="#FDE68A" stroke="#D97706" strokeWidth="2.5"/>
        {/* Trendy Hair */}
        <path d="M30 40 C30 24 38 17 50 17 C62 17 70 24 70 40 C66 32 58 31 50 33 C42 31 34 33 30 40 Z" fill="#374151" stroke="#1F2937" strokeWidth="2.5"/>
        {/* Glasses */}
        <rect x="36" y="38" width="12" height="9" rx="3" fill="#A7F3D0" fillOpacity="0.4" stroke="#047857" strokeWidth="2"/>
        <rect x="52" y="38" width="12" height="9" rx="3" fill="#A7F3D0" fillOpacity="0.4" stroke="#047857" strokeWidth="2"/>
        <line x1="48" y1="42" x2="52" y2="42" stroke="#047857" strokeWidth="2"/>
        {/* Eyes inside glasses */}
        <circle cx="42" cy="42.5" r="2" fill="#065F46"/>
        <circle cx="58" cy="42.5" r="2" fill="#065F46"/>
        {/* Headphones */}
        <path d="M25 44 C25 24 35 15 50 15 C65 15 75 24 75 44" stroke="#10B981" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <rect x="23" y="38" width="6" height="14" rx="3" fill="#047857" stroke="#064E3B" strokeWidth="1.5"/>
        <rect x="71" y="38" width="6" height="14" rx="3" fill="#047857" stroke="#064E3B" strokeWidth="1.5"/>
        {/* Smile */}
        <path d="M46 51 Q50 55 54 51" stroke="#92400E" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    )
  },

  // 5. Finance Wizard (พ่อมดการเงิน)
  {
    id: 'wizard',
    name: 'พ่อมดการเงิน',
    category: 'characters',
    emojiMatch: ['🧙‍♀️', '🧙‍♂️', '🧙', '✨'],
    render: ({ className = "w-full h-full" } = {}) => (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#FAF5FF" stroke="#6B21A8" strokeWidth="2.5"/>
        {/* Wizard Robe */}
        <path d="M22 96 C22 75 33 68 50 68 C67 68 78 75 78 96 Z" fill="#581C87" stroke="#3B0764" strokeWidth="2.5"/>
        <polygon points="50,74 46,96 54,96" fill="#A855F7"/>
        {/* Head */}
        <ellipse cx="50" cy="45" rx="18" ry="19" fill="#FDE68A" stroke="#D97706" strokeWidth="2.5"/>
        {/* Cheeks */}
        <circle cx="39" cy="49" r="3" fill="#F472B6" opacity="0.6"/>
        <circle cx="61" cy="49" r="3" fill="#F472B6" opacity="0.6"/>
        {/* Eyes */}
        <ellipse cx="43" cy="44" rx="2.8" ry="3.5" fill="#3B0764"/>
        <circle cx="44" cy="43" r="1" fill="#FFFFFF"/>
        <ellipse cx="57" cy="44" rx="2.8" ry="3.5" fill="#3B0764"/>
        <circle cx="58" cy="43" r="1" fill="#FFFFFF"/>
        {/* Smile */}
        <path d="M46 51 Q50 56 54 51" stroke="#7E22CE" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        {/* Wizard Hat */}
        <path d="M24 35 Q50 28 76 35 L70 32 L62 10 L50 8 L44 14 L30 32 Z" fill="#7E22CE" stroke="#581C87" strokeWidth="2.5"/>
        <ellipse cx="50" cy="33" rx="26" ry="6" fill="#6B21A8" stroke="#4C1D95" strokeWidth="2"/>
        <path d="M34 32 Q50 28 66 32" stroke="#FBBF24" strokeWidth="3.5" fill="none"/>
        {/* Magic Star on Hat */}
        <polygon points="50,16 52,21 57,21 53,24 55,29 50,26 45,29 47,24 43,21 48,21" fill="#FDE047"/>
      </svg>
    )
  },

  // 6. Lucky Cat (แมวกวักนำโชค)
  {
    id: 'lucky-cat',
    name: 'แมวกวักนำโชค',
    category: 'animals',
    emojiMatch: ['🐱', '😸', '🐈', '🐾'],
    render: ({ className = "w-full h-full" } = {}) => (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#FFFBEB" stroke="#B45309" strokeWidth="2.5"/>
        {/* Cat Body */}
        <ellipse cx="50" cy="85" rx="30" ry="22" fill="#FFFFFF" stroke="#D97706" strokeWidth="2.5"/>
        {/* Red Collar & Golden Bell */}
        <path d="M35 70 Q50 78 65 70" stroke="#EF4444" strokeWidth="5" strokeLinecap="round"/>
        <circle cx="50" cy="76" r="6" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5"/>
        <line x1="47" y1="76" x2="53" y2="76" stroke="#B45309" strokeWidth="1.5"/>
        {/* Cat Ears */}
        <polygon points="26,38 32,15 48,30" fill="#FFFFFF" stroke="#D97706" strokeWidth="2.5"/>
        <polygon points="29,35 34,20 44,30" fill="#FDA4AF"/>
        <polygon points="74,38 68,15 52,30" fill="#FFFFFF" stroke="#D97706" strokeWidth="2.5"/>
        <polygon points="71,35 66,20 56,30" fill="#FDA4AF"/>
        {/* Cat Head */}
        <circle cx="50" cy="46" r="24" fill="#FFFFFF" stroke="#D97706" strokeWidth="2.5"/>
        {/* Calico Patch */}
        <path d="M56 23 C65 24 73 31 73 40 C70 42 66 38 62 36 Z" fill="#F59E0B"/>
        {/* Cheeks */}
        <circle cx="37" cy="51" r="3.5" fill="#FDA4AF" opacity="0.8"/>
        <circle cx="63" cy="51" r="3.5" fill="#FDA4AF" opacity="0.8"/>
        {/* Eyes (Happy Closed Crescent Eyes) */}
        <path d="M37 44 Q42 39 45 44" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M55 44 Q58 39 63 44" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        {/* Nose & Mouth */}
        <polygon points="48,48 52,48 50,51" fill="#F43F5E"/>
        <path d="M45 52 Q48 56 50 52 Q52 56 55 52" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none"/>
        {/* Whiskers */}
        <line x1="28" y1="47" x2="20" y2="45" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="28" y1="52" x2="19" y2="53" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="72" y1="47" x2="80" y2="45" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="72" y1="52" x2="81" y2="53" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round"/>
        {/* Raised Lucky Paw */}
        <ellipse cx="25" cy="62" rx="7" ry="11" fill="#FFFFFF" stroke="#D97706" strokeWidth="2.2" transform="rotate(-20 25 62)"/>
        <circle cx="23" cy="58" r="2.5" fill="#FDA4AF"/>
      </svg>
    )
  },

  // 7. Clever Fox (จิ้งจอกเจ้าปัญญา)
  {
    id: 'clever-fox',
    name: 'จิ้งจอกเจ้าปัญญา',
    category: 'animals',
    emojiMatch: ['🦊'],
    render: ({ className = "w-full h-full" } = {}) => (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#FFF7ED" stroke="#C2410C" strokeWidth="2.5"/>
        {/* Body */}
        <path d="M28 96 C28 78 37 72 50 72 C63 72 72 78 72 96 Z" fill="#EA580C" stroke="#9A3412" strokeWidth="2.5"/>
        <polygon points="50,72 44,96 56,96" fill="#FFF7ED"/>
        {/* Big Fox Ears */}
        <polygon points="26,38 28,14 48,28" fill="#EA580C" stroke="#9A3412" strokeWidth="2.5"/>
        <polygon points="29,32 30,19 43,26" fill="#1E293B"/>
        <polygon points="74,38 72,14 52,28" fill="#EA580C" stroke="#9A3412" strokeWidth="2.5"/>
        <polygon points="71,32 70,19 57,26" fill="#1E293B"/>
        {/* Head */}
        <ellipse cx="50" cy="46" rx="24" ry="21" fill="#EA580C" stroke="#9A3412" strokeWidth="2.5"/>
        {/* White Cheeks / Muzzle */}
        <path d="M27 48 Q35 62 50 64 Q65 62 73 48 C73 58 64 68 50 68 C36 68 27 58 27 48 Z" fill="#FFFFFF" stroke="#9A3412" strokeWidth="1.5"/>
        {/* Cute Black Nose */}
        <ellipse cx="50" cy="59" rx="3.5" ry="2.5" fill="#1E293B"/>
        {/* Cheerful Eyes */}
        <ellipse cx="40" cy="44" rx="3" ry="3.5" fill="#1E293B"/>
        <circle cx="41" cy="43" r="1.2" fill="#FFFFFF"/>
        <ellipse cx="60" cy="44" rx="3" ry="3.5" fill="#1E293B"/>
        <circle cx="61" cy="43" r="1.2" fill="#FFFFFF"/>
        {/* Smile */}
        <path d="M47 62 Q50 65 53 62" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    )
  },

  // 8. Leader Lion (สิงโตเจ้าป่าผู้นำ)
  {
    id: 'leader-lion',
    name: 'สิงโตเจ้าป่าผู้นำ',
    category: 'animals',
    emojiMatch: ['🦁'],
    render: ({ className = "w-full h-full" } = {}) => (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#FEFCE8" stroke="#A16207" strokeWidth="2.5"/>
        {/* Fluffy Lion Mane */}
        <circle cx="50" cy="48" r="32" fill="#D97706" stroke="#92400E" strokeWidth="2.5"/>
        <circle cx="28" cy="30" r="9" fill="#D97706"/>
        <circle cx="72" cy="30" r="9" fill="#D97706"/>
        <circle cx="22" cy="50" r="9" fill="#D97706"/>
        <circle cx="78" cy="50" r="9" fill="#D97706"/>
        {/* Ears */}
        <circle cx="32" cy="28" r="6" fill="#FBBF24" stroke="#92400E" strokeWidth="1.5"/>
        <circle cx="32" cy="28" r="3" fill="#F59E0B"/>
        <circle cx="68" cy="28" r="6" fill="#FBBF24" stroke="#92400E" strokeWidth="1.5"/>
        <circle cx="68" cy="28" r="3" fill="#F59E0B"/>
        {/* Golden Crown */}
        <polygon points="40,24 43,14 50,18 57,14 60,24" fill="#FBBF24" stroke="#B45309" strokeWidth="1.5"/>
        <circle cx="43" cy="14" r="1.5" fill="#EF4444"/>
        <circle cx="50" cy="18" r="1.5" fill="#3B82F6"/>
        <circle cx="57" cy="14" r="1.5" fill="#10B981"/>
        {/* Lion Face */}
        <ellipse cx="50" cy="49" rx="20" ry="19" fill="#FDE047" stroke="#92400E" strokeWidth="2"/>
        {/* Cheeks */}
        <circle cx="39" cy="53" r="3" fill="#F87171" opacity="0.6"/>
        <circle cx="61" cy="53" r="3" fill="#F87171" opacity="0.6"/>
        {/* Eyes */}
        <ellipse cx="43" cy="46" rx="2.8" ry="3.5" fill="#451A03"/>
        <circle cx="44" cy="45" r="1.2" fill="#FFFFFF"/>
        <ellipse cx="57" cy="46" rx="2.8" ry="3.5" fill="#451A03"/>
        <circle cx="58" cy="45" r="1.2" fill="#FFFFFF"/>
        {/* Snout & Nose */}
        <ellipse cx="50" cy="54" rx="7" ry="5" fill="#FEF08A"/>
        <polygon points="47,52 53,52 50,55" fill="#92400E"/>
        <path d="M47 56 Q50 59 53 56" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      </svg>
    )
  },

  // 9. Loyal Dog (ชิบะอินุร่าเริง)
  {
    id: 'loyal-dog',
    name: 'ชิบะอินุร่าเริง',
    category: 'animals',
    emojiMatch: ['🐶', '🐕', '🦮'],
    render: ({ className = "w-full h-full" } = {}) => (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#EFF6FF" stroke="#1D4ED8" strokeWidth="2.5"/>
        {/* Body */}
        <path d="M28 96 C28 78 37 72 50 72 C63 72 72 78 72 96 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="2.5"/>
        {/* Blue Scarf */}
        <path d="M34 72 Q50 82 66 72" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round"/>
        {/* Ears */}
        <polygon points="26,38 30,16 48,28" fill="#D97706" stroke="#92400E" strokeWidth="2"/>
        <polygon points="74,38 70,16 52,28" fill="#D97706" stroke="#92400E" strokeWidth="2"/>
        {/* Head */}
        <ellipse cx="50" cy="47" rx="23" ry="21" fill="#F59E0B" stroke="#B45309" strokeWidth="2.5"/>
        {/* Shiba White Eyebrow Dots */}
        <circle cx="41" cy="38" r="3" fill="#FFFFFF"/>
        <circle cx="59" cy="38" r="3" fill="#FFFFFF"/>
        {/* White Muzzle */}
        <ellipse cx="50" cy="54" rx="13" ry="11" fill="#FFFFFF"/>
        {/* Eyes */}
        <ellipse cx="41" cy="45" rx="3" ry="3.5" fill="#1E293B"/>
        <circle cx="42" cy="44" r="1.2" fill="#FFFFFF"/>
        <ellipse cx="59" cy="45" rx="3" ry="3.5" fill="#1E293B"/>
        <circle cx="60" cy="44" r="1.2" fill="#FFFFFF"/>
        {/* Black Nose */}
        <ellipse cx="50" cy="51" rx="3.5" ry="2.5" fill="#1E293B"/>
        {/* Tongue Out */}
        <path d="M47 55 Q50 58 53 55" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        <path d="M48 57 C48 62 52 62 52 57 Z" fill="#FB7185"/>
      </svg>
    )
  },

  // 10. Cute Dinosaur (ไดโนน้อยนักสู้)
  {
    id: 'cute-dino',
    name: 'ไดโนน้อยนักสู้',
    category: 'animals',
    emojiMatch: ['🐸', '🦖', '🦕'],
    render: ({ className = "w-full h-full" } = {}) => (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#ECFDF5" stroke="#059669" strokeWidth="2.5"/>
        {/* Dino Body */}
        <path d="M26 96 C26 76 35 70 50 70 C65 70 74 76 74 96 Z" fill="#10B981" stroke="#047857" strokeWidth="2.5"/>
        {/* Back Spikes */}
        <polygon points="50,15 46,24 54,24" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5"/>
        <polygon points="36,20 34,29 42,27" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5"/>
        <polygon points="64,20 58,27 66,29" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5"/>
        {/* Head */}
        <ellipse cx="50" cy="47" rx="24" ry="23" fill="#10B981" stroke="#047857" strokeWidth="2.5"/>
        {/* Cute Cheeks */}
        <circle cx="36" cy="53" r="4" fill="#F472B6" opacity="0.6"/>
        <circle cx="64" cy="53" r="4" fill="#F472B6" opacity="0.6"/>
        {/* Big Sparkling Eyes */}
        <ellipse cx="40" cy="44" rx="4.5" ry="5.5" fill="#064E3B"/>
        <circle cx="42" cy="42" r="2" fill="#FFFFFF"/>
        <circle cx="38" cy="46" r="0.8" fill="#FFFFFF"/>
        <ellipse cx="60" cy="44" rx="4.5" ry="5.5" fill="#064E3B"/>
        <circle cx="62" cy="42" r="2" fill="#FFFFFF"/>
        <circle cx="58" cy="46" r="0.8" fill="#FFFFFF"/>
        {/* Nostrils */}
        <circle cx="47" cy="52" r="1.2" fill="#047857"/>
        <circle cx="53" cy="52" r="1.2" fill="#047857"/>
        {/* Cute Smile */}
        <path d="M44 57 Q50 63 56 57" stroke="#064E3B" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      </svg>
    )
  },

  // 11. Smart Robot (หุ่นยนต์ AI อัจฉริยะ)
  {
    id: 'smart-robot',
    name: 'หุ่นยนต์ AI อัจฉริยะ',
    category: 'characters',
    emojiMatch: ['🤖', '🦾', '⚙️'],
    render: ({ className = "w-full h-full" } = {}) => (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#F0FDF4" stroke="#16A34A" strokeWidth="2.5"/>
        {/* Antenna */}
        <line x1="50" y1="26" x2="50" y2="15" stroke="#475569" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="50" cy="14" r="5" fill="#FACC15" stroke="#CA8A04" strokeWidth="2"/>
        {/* Robot Head */}
        <rect x="26" y="26" width="48" height="42" rx="12" fill="#E2E8F0" stroke="#334155" strokeWidth="2.5"/>
        {/* Side Ear Bolts */}
        <rect x="20" y="38" width="6" height="18" rx="2" fill="#94A3B8" stroke="#334155" strokeWidth="1.5"/>
        <rect x="74" y="38" width="6" height="18" rx="2" fill="#94A3B8" stroke="#334155" strokeWidth="1.5"/>
        {/* Digital Screen Visor */}
        <rect x="32" y="34" width="36" height="22" rx="6" fill="#0F172A" stroke="#1E293B" strokeWidth="1.5"/>
        {/* Glowing Cyan LED Eyes */}
        <circle cx="42" cy="44" r="4" fill="#38BDF8"/>
        <circle cx="43" cy="43" r="1.5" fill="#FFFFFF"/>
        <circle cx="58" cy="44" r="4" fill="#38BDF8"/>
        <circle cx="59" cy="43" r="1.5" fill="#FFFFFF"/>
        {/* Robot Mouth Speaker */}
        <rect x="40" y="59" width="20" height="4" rx="2" fill="#64748B"/>
        {/* Body */}
        <path d="M26 96 C26 78 35 74 50 74 C65 74 74 78 74 96 Z" fill="#94A3B8" stroke="#334155" strokeWidth="2.5"/>
        <circle cx="50" cy="85" r="4" fill="#38BDF8"/>
      </svg>
    )
  },

  // 12. Star Champion (แชมเปี้ยนดาวเด่น)
  {
    id: 'star-champion',
    name: 'แชมเปี้ยนดาวเด่น',
    category: 'characters',
    emojiMatch: ['⭐', '🌟', '👑', '🏆'],
    render: ({ className = "w-full h-full" } = {}) => (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#FFFBEB" stroke="#D97706" strokeWidth="2.5"/>
        {/* Big Golden Star */}
        <polygon points="50,15 59,35 81,37 65,51 70,73 50,61 30,73 35,51 19,37 41,35" fill="#FBBF24" stroke="#B45309" strokeWidth="2.5" strokeLinejoin="round"/>
        {/* Crown on top */}
        <polygon points="43,20 45,11 50,15 55,11 57,20" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.2"/>
        {/* Cheerful Cheeks */}
        <circle cx="40" cy="48" r="3.5" fill="#F87171" opacity="0.7"/>
        <circle cx="60" cy="48" r="3.5" fill="#F87171" opacity="0.7"/>
        {/* Happy Eyes */}
        <ellipse cx="42" cy="43" rx="2.5" ry="3.5" fill="#451A03"/>
        <circle cx="43" cy="42" r="1" fill="#FFFFFF"/>
        <ellipse cx="58" cy="43" rx="2.5" ry="3.5" fill="#451A03"/>
        <circle cx="59" cy="42" r="1" fill="#FFFFFF"/>
        {/* Cute Smile */}
        <path d="M46 51 Q50 56 54 51" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    )
  }
];

/**
 * Finds matching cartoon avatar by ID or emoji
 */
export function getCartoonAvatar(avatarValue: string): CartoonAvatar | undefined {
  if (!avatarValue) return undefined;
  const trimmed = avatarValue.trim();
  
  // 1. Match by ID
  const byId = CARTOON_AVATARS.find(a => a.id.toLowerCase() === trimmed.toLowerCase());
  if (byId) return byId;

  // 2. Match by Emoji
  const byEmoji = CARTOON_AVATARS.find(a => a.emojiMatch.includes(trimmed));
  if (byEmoji) return byEmoji;

  return undefined;
}
