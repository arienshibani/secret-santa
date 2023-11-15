export const setUpSecretSanta = (arrayOfPeople) => {
    // Check if there are enough people to play the game
    if (arrayOfPeople.length < 2) {
        throw new Error("You cant play secret santa with less than 2 people.. sorry!");
    }

    // Shuffle the array of people
    const shuffledPeople = shuffleArray(arrayOfPeople)
    
    // Assign Secret Santa partners
    let result = {};
    for (let i = 0; i < shuffledPeople.length; i++) {
        const currentPerson = shuffledPeople[i];
        const nextPerson = i === shuffledPeople.length - 1 ? shuffledPeople[0] : shuffledPeople[i + 1];
        result[currentPerson.email] = "Your secret santa is: " + nextPerson.name + "!";
    }

    return result;
}


const shuffleArray = (array) => {
    return [...array] // Shallow copy of array you don't mutate the original array.
    .map(value => ({value, sort: Math.random()})) // Associate a random number to each element.
    .sort((a, b) => a.sort - b.sort) // Sort by the random number.
    .map(({value}) => value); // Remove the random numbers from all the elements.
}
