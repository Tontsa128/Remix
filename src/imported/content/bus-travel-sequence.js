export const BUS_TRAVEL_SEQUENCE = [
    {
        id: "check-route",
        order: 1,
        words: { fi: "tarkistaa reitti", es: "consultar la ruta", en: "check the route" },
        description: { fi: "Tarkista reitti ja oikea pysäkki", es: "Consulta la ruta y la parada correcta", en: "Check the route and the correct stop" },
    },
    {
        id: "buy-ticket",
        order: 2,
        words: { fi: "ostaa lippu", es: "comprar un billete", en: "buy a ticket" },
        description: { fi: "Osta matkalippu ennen bussiin nousua", es: "Compra el billete antes de subir al autobús", en: "Buy a ticket before boarding the bus" },
    },
    {
        id: "wait-bus",
        order: 3,
        words: { fi: "odottaa bussia", es: "esperar el autobús", en: "wait for the bus" },
        description: { fi: "Odota oikeaa bussia pysäkillä", es: "Espera el autobús correcto en la parada", en: "Wait for the correct bus at the stop" },
    },
    {
        id: "board-bus",
        order: 4,
        words: { fi: "nousta bussiin", es: "subir al autobús", en: "board the bus" },
        description: { fi: "Nouse bussiin ja näytä lippu tarvittaessa", es: "Sube al autobús y muestra el billete si es necesario", en: "Board the bus and show your ticket if required" },
    },
];
