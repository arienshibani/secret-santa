import { setUpSecretSanta } from './src/setupSecretSanta.js';

const people = [
    { name: "JoeBiden", email: "JoeBiden@gmail.com" },
    { name: "Obama", email: "Obeezy@gmail.com" },
    { name: "Trump", email: "Trump@gmail.com" },
];

const secretSantaPairs = setUpSecretSanta(people);
console.info("🎄 E-mails and recipients matched!", secretSantaPairs, "Now send them an e-mail with further instructions!");
