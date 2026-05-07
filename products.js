const products = [
    {
        id: 10,
        name: "1,000 V-Bucks",
        price: 78.00,
        category: "fortnite",
        icon: "fas fa-gift",
        image: "https://i.imgur.com/bAD3nB1.png",
        badge: "Regalo Seguro",
        description: "Perfecta para enviarte regalos entre cuentas: Nueva, privada, legal: VBucks son comprados en pesos argentinos!"
    },
    {
        id: 11,
        name: "1,600 V-Bucks",
        price: 144.00,
        category: "fortnite",
        icon: "fas fa-gift",
        image: "https://i.imgur.com/KQZ4gx3.png",
        badge: "Regalo Seguro",
        description: "Perfecta para enviarte regalos entre cuentas: Nueva, privada, legal: VBucks son comprados en pesos argentinos!"
    },
    {
        id: 12,
        name: "2,200 V-Bucks",
        price: 228.00,
        category: "fortnite",
        icon: "fas fa-gift",
        image: "https://i.imgur.com/WSRmepB.png",
        badge: "Regalo Seguro",
        description: "Perfecta para enviarte regalos entre cuentas: Nueva, privada, legal: VBucks son comprados en pesos argentinos!"
    },
    {
        id: 20,
        name: "Free Fire - Diamantes",
        category: "gaming",
        type: "selectable",
        icon: "fas fa-gem",
        image: "https://i.imgur.com/WvXXd5I.png",
        badge: "ID Requerido",
        description: "Recarga diamantes para tu cuenta de Free Fire de forma rápida y segura. Entrega directa a tu ID de jugador. Válido para todas las regiones.",
        variants: [
            { name: "110 💎", price: 30.00 },
            { name: "341 💎", price: 80.00 },
            { name: "572 💎", price: 120.00 },
            { name: "1166 💎", price: 220.00 },
            { name: "2398 💎", price: 410.00 },
            { name: "6160 💎", price: 850.00 },
            { name: "220 💎", price: 55.00 },
            { name: "451 💎", price: 110.00 },
            { name: "682 💎", price: 165.00 },
            { name: "792 💎", price: 175.00 },
            { name: "913 💎", price: 190.00 },
            { name: "1023 💎", price: 215.00 },
            { name: "1276 💎", price: 240.00 },
            { name: "1507 💎", price: 285.00 },
            { name: "1617 💎", price: 310.00 },
            { name: "1738 💎", price: 340.00 },
            { name: "2079 💎", price: 410.00 },
            { name: "2508 💎", price: 480.00 },
            { name: "2970 💎", price: 520.00 },
            { name: "3080 💎", price: 560.00 },
            { name: "3564 💎", price: 630.00 },
            { name: "4136 💎", price: 710.00 },
            { name: "4796 💎", price: 760.00 },
            { name: "5368 💎", price: 870.00 },
            { name: "7326 💎", price: 1100.00 },
            { name: "8008 💎", price: 1300.00 },
            { name: "10065 💎", price: 1500.00 },
            { name: "12320 💎", price: 1620.00 },
            { name: "18480 💎", price: 2800.00 },
            { name: "24640 💎", price: 3650.00 },
            { name: "30800 💎", price: 4648.00 },
            { name: "𝙋𝘼𝙎𝙀 𝘽𝙊𝙊𝙔𝘼𝙃", price: 65.00 }
        ]
    },
    /* STREAMING PLATFORMS - SELECTABLE VARIANTS */
    {
        id: 300,
        name: "Netflix Premium",
        category: "streaming",
        type: "selectable",
        icon: "fas fa-tv",
        image: "https://i.imgur.com/TT7IPi9.png",
        badge: "Más Vendido 🔥",
        description: "Disfruta de lo mejor del cine y series en Netflix Premium 4K Ultra HD. Elige entre un perfil privado o la cuenta completa para tu hogar.",
        variants: [
            { name: "Perfil 🍯", price: 65.00 },
            { name: "Cuenta Completa 🧸", price: 268.00 },
            { name: "Premium BUG (Completa) 🧸", price: 275.00 }
        ]
    },
    {
        id: 301,
        name: "Disney+ Premium",
        category: "streaming",
        type: "selectable",
        icon: "fas fa-plus",
        image: "https://i.imgur.com/RgHsfGn.png",
        badge: "Premium 🍯",
        description: "Todo el contenido de Disney, Pixar, Marvel, Star Wars y National Geographic en calidad 4K.",
        variants: [
            { name: "Perfil 🍯", price: 32.00 },
            { name: "Cuenta Completa 🧸", price: 78.00 }
        ]
    },
    {
        id: 302,
        name: "Max Hulu",
        category: "streaming",
        type: "selectable",
        icon: "fas fa-film",
        image: "https://i.imgur.com/Pj1i6vL.png",
        badge: "Hulu Included 🍯",
        description: "Acceso exclusivo a Max (HBO) y Hulu en una sola suscripción. El mejor drama y entretenimiento.",
        variants: [
            { name: "Perfil 🍯", price: 31.00 },
            { name: "Cuenta Completa 🧸", price: 65.00 }
        ]
    },
    {
        id: 303,
        name: "Disney+ Estándar",
        category: "streaming",
        type: "selectable",
        icon: "fas fa-tv",
        image: "https://i.imgur.com/gHahb1M.png",
        badge: "Estándar 🍯",
        description: "Disfruta de Disney+ con calidad estándar. Ideal para dispositivos móviles y tablets.",
        variants: [
            { name: "Perfil 🍯", price: 25.00 }
        ]
    },
    {
        id: 304,
        name: "ViX Premium 1 Mes",
        category: "streaming",
        type: "selectable",
        icon: "fas fa-star",
        image: "https://i.imgur.com/Jwmtlw1.png",
        badge: "En Vivo 🍯",
        description: "Deportes en vivo, series y películas originales en español con ViX Premium.",
        variants: [
            { name: "Perfil 🍯", price: 25.00 },
            { name: "Cuenta Completa 🧸", price: 36.00 }
        ]
    },
    {
        id: 305,
        name: "Crunchyroll Mega Fan",
        category: "streaming",
        type: "selectable",
        icon: "fas fa-dragon",
        image: "https://i.imgur.com/4UXLqdC.png",
        badge: "Anime 🍯",
        description: "Tu anime favorito sin anuncios y en múltiples dispositivos con Crunchyroll Mega Fan.",
        variants: [
            { name: "Perfil 🍯", price: 38.00 },
            { name: "Cuenta Completa 🧸", price: 63.00 }
        ]
    },
    {
        id: 306,
        name: "Paramount+",
        category: "streaming",
        type: "selectable",
        icon: "fas fa-mountain",
        image: "https://i.imgur.com/y4myFdz.png",
        badge: "Series 🍯",
        description: "Acceso a todo el catálogo de Paramount+, incluyendo exclusivas y estrenos.",
        variants: [
            { name: "Perfil 🍯", price: 34.00 },
            { name: "Cuenta Completa 🧸", price: 48.00 }
        ]
    },
    {
        id: 307,
        name: "Apple Combo (Music + TV)",
        category: "streaming",
        type: "selectable",
        icon: "fab fa-apple",
        image: "https://i.imgur.com/b5Tba7x.png",
        badge: "1 Mes 🍯",
        description: "Suscripción combinada de Apple Music y Apple TV+ por 30 días. Música y series premium.",
        variants: [
            { name: "Perfil 🍯", price: 158.00 }
        ]
    },
    {
        id: 308,
        name: "Adobe Creative Cloud",
        category: "streaming",
        type: "selectable",
        icon: "fas fa-paint-brush",
        image: "https://i.imgur.com/MTUVbmi.png",
        badge: "3 Meses 🧸",
        description: "Acceso completo a todas las aplicaciones de Adobe Creative Cloud durante 3 meses.",
        variants: [
            { name: "Cuenta Completa 🧸", price: 168.00 }
        ]
    },
    {
        id: 309,
        name: "Duolingo Super",
        category: "streaming",
        type: "selectable",
        icon: "fas fa-owl",
        image: "https://i.imgur.com/bctv2i5.png",
        badge: "Sin Anuncios 🧸",
        description: "Aprende idiomas sin interrupciones con Duolingo Super. Corazones ilimitados y más.",
        variants: [
            { name: "1 Año 🧸", price: 65.00 },
            { name: "3 Meses 🧸", price: 68.00 }
        ]
    },
    {
        id: 311,
        name: "Chat GPT",
        category: "streaming",
        type: "selectable",
        icon: "fas fa-robot",
        image: "https://i.imgur.com/y6wliYM.png",
        badge: "AI Premium",
        description: "Acceso a las funciones más avanzadas de ChatGPT. Cuenta nueva renovable o activación en tu propia cuenta.",
        variants: [
            { name: "Cuenta nueva (renovable pagando 2 dias antes de que venza)", price: 75.00 },
            { name: "Cuenta principal por invitacion a correo", price: 83.00 }
        ]
    },
    {
        id: 310,
        name: "Canva Pro (Equipo Edu)",
        category: "streaming",
        type: "selectable",
        icon: "fas fa-palette",
        image: "https://i.imgur.com/DhS9oXB.png",
        badge: "Diseño 🌛",
        description: "Herramientas de diseño profesional con Canva Pro. Acceso mediante equipo educativo.",
        variants: [
            { name: "1 Mes 🌛", price: 15.00 },
            { name: "2 Meses 🌛", price: 27.00 },
            { name: "4 Meses 🌛", price: 38.00 },
            { name: "6 Meses 🌛", price: 50.00 },
            { name: "Anual 🌛", price: 78.00 }
        ]
    },
    {
        id: 90,
        name: "Seguidores de Instagram",
        price: 43.00,
        priceWithGuarantee: 59.00,
        category: "extras",
        type: "calculator",
        icon: "fab fa-instagram",
        image: "https://i.imgur.com/C6AaEtZ.png",
        badge: "+1k Regalados",
        description: "Aumenta tu presencia en Instagram con seguidores reales de alta calidad.\n\n📉 **Caída estimada**: 0-10%\n🛡️ **Garantía**: 1 mes completo\n\n🔥 **PROMOCIÓN**: En la compra de más de 2,000 seguidores, recibe 1,000 Likes totalmente DE REGALO para la foto que quieras.",
        unitName: "Seguidores",
        minAmount: 100,
        step: 100
    },
    {
        id: 91,
        name: "Cualquier Juego Steam",
        price: 195.00,
        category: "extras",
        icon: "fab fa-steam",
        image: "https://i.imgur.com/7utJM89.png",
        badge: "Económico",
        description: "Obtén cualquier juego de Steam mediante este método exclusivo.\n\n✅ Un solo pago\n✅ Cuenta principal de Steam\n✅ Sin riesgo de baneo\n✅ No Bin / No CC\n✅ Funciona para jugar Online",
        platform: "PC"
    },
    {
        id: 92,
        name: "Panel de TikTok (Vistas Gratis)",
        price: 98.00,
        category: "extras",
        icon: "fab fa-tiktok",
        image: "https://i.imgur.com/LE4UIfT.png",
        badge: "Auto-Servicio",
        description: "Obtén acceso a nuestro panel exclusivo de TikTok. Genera vistas, likes, seguidores, compartidos y guardados de forma gratuita.\n\n🚀 **USO ILIMITADO**: Puedes usarlo para tus propias cuentas o incluso abrir tu propio negocio de reventa de servicios sociales.",
    },



    // --- MAYOREO ---
    {
        id: 200,
        name: "1k VBucks Accounts (Mayoreo)",
        price: 31.00,
        category: "mayoreo",
        type: "calculator",
        minAmount: 5,
        unitName: "Cuentas",
        icon: "fas fa-users",
        image: "https://i.imgur.com/1eaj9mt.png",
        badge: "MIN 5",
        description: "Cuentas creadas a pedido. Incluyen Crew Fortnite activado y Pase de Batalla."
    },
    {
        id: 201,
        name: "1.6k VBucks Accounts (Mayoreo)",
        price: 98.00,
        category: "mayoreo",
        type: "calculator",
        minAmount: 3,
        unitName: "Cuentas",
        icon: "fas fa-users",
        image: "https://i.imgur.com/0euVHAc.png",
        badge: "MIN 3",
        description: "Cuentas creadas a pedido. Incluyen Crew Fortnite activado y Pase de Batalla."
    },
    {
        id: 202,
        name: "2.2k VBucks Accounts (Mayoreo)",
        price: 188.00,
        category: "mayoreo",
        type: "calculator",
        minAmount: 3,
        unitName: "Cuentas",
        icon: "fas fa-users",
        image: "https://i.imgur.com/ZM6IAve.png",
        badge: "MIN 3",
        description: "Cuentas creadas a pedido. Incluyen Crew Fortnite activado y Pase de Batalla."
    },
    {
        id: 203,
        name: "Crew Fortnite (Nuevas Xbox)",
        price: 32.00,
        category: "mayoreo",
        type: "calculator",
        minAmount: 5,
        unitName: "Cuentas",
        icon: "fab fa-xbox",
        image: "https://i.imgur.com/cOUzFtj.png",
        badge: "MIN 5",
        description: "Cuentas Xbox para vincular a Epic Games y obtener Crew Fortnite."
    },
    {
        id: 204,
        name: "Crew Fortnite Xbox (A Principal)",
        price: 78.00,
        category: "mayoreo",
        type: "calculator",
        minAmount: 5,
        unitName: "Activaciones",
        icon: "fab fa-xbox",
        image: "https://i.imgur.com/001A83d.png",
        badge: "MIN 5",
        description: "Se necesita acceso al correo y contraseña de Xbox para activar el Club en tu cuenta principal."
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = products;
}
