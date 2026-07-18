const products = [
    // --- Crew FN ---
    {
        id: 1,
        name: "Crew FN (XBOX-PC-PLAY)",
        price: 94.00,
        category: "crew",
        icon: "fab fa-xbox",
        image: "https://i.imgur.com/3XpcBuu.png", // Fortnite placeholder
        badge: "OFERTA",
        description: "Se aplica directamente a tu cuenta personal. Requiere que tengas acceso a tu cuenta de Xbox vinculada a Epic Games (o vincular una)."
    },
    {
        id: 2,
        name: "Crew Fortnite (No Xbox Linked)",
        price: 64.00,
        category: "crew",
        icon: "fas fa-gamepad",
        image: "https://i.imgur.com/3XpcBuu.png",
        badge: "",
        description: "Se entrega una cuenta de Xbox nueva para que la vincules a tu cuenta de Epic Games. Es necesario que no tengas otra cuenta de Xbox vinculada previamente."
    },

    // --- V-Bucks ---
    {
        id: 3,
        name: "1.4k VBucks (New Acc)",
        price: 132.00,
        category: "vbucks",
        icon: "fas fa-coins",
        image: "https://i.imgur.com/bAD3nB1.png",
        badge: "",
        description: "Cuentas nuevas y privadas. V-Bucks comprados en regiones específicas (como Argentina). Ideal para enviar regalos."
    },
    {
        id: 4,
        name: "2.8k VBucks (New Acc)",
        price: 272.00,
        category: "vbucks",
        icon: "fas fa-coins",
        image: "https://i.imgur.com/WSRmepB.png",
        badge: "OFERTA",
        description: "Cuentas nuevas y privadas. V-Bucks comprados en regiones específicas (como Argentina). Ideal para enviar regalos."
    },
    {
        id: 5,
        name: "2k VBucks (New Acc)",
        price: 205.00,
        category: "vbucks",
        icon: "fas fa-coins",
        image: "https://i.imgur.com/KQZ4gx3.png",
        badge: "OFERTA",
        description: "Cuentas nuevas y privadas. V-Bucks comprados en regiones específicas (como Argentina). Ideal para enviar regalos."
    },
    {
        id: 6,
        name: "800 VBucks (New Acc)",
        price: 75.00,
        category: "vbucks",
        icon: "fas fa-coins",
        image: "https://i.imgur.com/bAD3nB1.png",
        badge: "",
        description: "Cuentas nuevas y privadas. V-Bucks comprados en regiones específicas (como Argentina). Ideal para enviar regalos."
    },

    // --- Realms ---
    {
        id: 7,
        name: "Minecraft Realm (x1 month)",
        price: 77.00,
        category: "realms",
        icon: "fas fa-cube",
        image: "https://i.imgur.com/WvXXd5I.png", // Reusing a placeholder
        badge: "OFERTA",
        description: "Servicio de hosting para un servidor de Minecraft (Java y/o Bedrock), aplicable a cuenta personal o cuenta nueva."
    },

    // --- Discord ---
    {
        id: 8,
        name: "Nitro Boost Trial (3 Meses)",
        price: 63.00,
        category: "discord",
        icon: "fab fa-discord",
        image: "https://i.imgur.com/TT7IPi9.png",
        badge: "",
        description: "Un enlace de prueba gratuita de 3 meses para Discord Nitro."
    },
    {
        id: 9,
        name: "Nitro Boost Trial (30 días)",
        price: 59.00,
        category: "discord",
        icon: "fab fa-discord",
        image: "https://i.imgur.com/TT7IPi9.png",
        badge: "",
        description: "Un enlace de prueba gratuita de 1 mes (30 días) para Discord Nitro."
    },
    {
        id: 10,
        name: "x14 Boosts (x1 month)",
        price: 193.00,
        category: "discord",
        icon: "fas fa-rocket",
        image: "https://i.imgur.com/TT7IPi9.png",
        badge: "",
        description: "Paquete de 14 potenciadores (boosts) para un servidor de Discord personal con una duración aproximada de un mes (27-30 días)."
    },

    // --- Mayoreos / ReVenta ---
    {
        id: 11,
        name: "1.4k VBucks (Mayoreo)",
        price: 75.00,
        category: "mayoreo",
        icon: "fas fa-users",
        image: "https://i.imgur.com/1eaj9mt.png",
        badge: "MIN 3",
        minAmount: 3,
        type: "calculator",
        unitName: "Cuentas",
        description: "Cuentas creadas a pedido. V-Bucks listos para enviar regalos."
    },
    {
        id: 12,
        name: "2.8k VBucks (Mayoreo)",
        price: 239.00,
        category: "mayoreo",
        icon: "fas fa-users",
        image: "https://i.imgur.com/ZM6IAve.png",
        badge: "MIN 3",
        minAmount: 3,
        type: "calculator",
        unitName: "Cuentas",
        description: "Cuentas creadas a pedido. V-Bucks listos para enviar regalos."
    },
    {
        id: 13,
        name: "2k VBucks (Mayoreo)",
        price: 149.00,
        category: "mayoreo",
        icon: "fas fa-users",
        image: "https://i.imgur.com/0euVHAc.png",
        badge: "MIN 3",
        minAmount: 3,
        type: "calculator",
        unitName: "Cuentas",
        description: "Cuentas creadas a pedido. V-Bucks listos para enviar regalos."
    },
    {
        id: 14,
        name: "800 VBucks (Mayoreo)",
        price: 35.00,
        category: "mayoreo",
        icon: "fas fa-users",
        image: "https://i.imgur.com/1eaj9mt.png",
        badge: "MIN 5",
        minAmount: 5,
        type: "calculator",
        unitName: "Cuentas",
        description: "Son cuentas creadas a pedido, incluyen Crew Fortnite activado y pase de batalla."
    },
    {
        id: 15,
        name: "Crew FN (XBOX-PC-PLAY) Créditos",
        price: 60.00,
        category: "mayoreo",
        icon: "fab fa-xbox",
        image: "https://i.imgur.com/001A83d.png",
        badge: "MIN 5",
        minAmount: 5,
        type: "calculator",
        unitName: "Activaciones",
        description: "Es el saldo para aplicar a tu cuenta personal (Mayoreo)."
    },
    {
        id: 16,
        name: "Crew Fortnite (No Xbox Linked)",
        price: 34.00,
        category: "mayoreo",
        icon: "fas fa-gamepad",
        image: "https://i.imgur.com/cOUzFtj.png",
        badge: "MIN 5",
        minAmount: 5,
        type: "calculator",
        unitName: "Cuentas",
        description: "Cuentas de Xbox listas para vincular a Epic (Mayoreo)."
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = products;
}
