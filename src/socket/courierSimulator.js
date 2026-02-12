const cities = require("./courierCities");

function getRandomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}

module.exports.startCourier = (io, orderId, userLat, userLng) => {
  const city = getRandomCity();

  console.log(
    `🛵 Courier for order ${orderId} starting from ${city.name}`
  );

  let lat = city.lat;
  let lng = city.lng;

  const steps = 15;
  const latStep = (userLat - lat) / steps;
  const lngStep = (userLng - lng) / steps;

  let count = 0;

  const interval = setInterval(() => {
    lat += latStep;
    lng += lngStep;

    io.to(orderId).emit("courier-location", {
      orderId,
      lat,
      lng,
      city: city.name,
    });

    count++;

    if (count >= steps) {
      clearInterval(interval);
      io.to(orderId).emit("courier-delivered", { orderId });
      console.log(`📦 Order ${orderId} delivered`);
    }
  }, 1000);
};
