export type Story = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  species: "Cat" | "Dog" | "Bird" | "Other";
  location: string;
  dateISO: string;
  coverImage: string;
};

export const STORIES: Story[] = [
  {
    slug: "mango-the-morning-cat",
    title: "Mango and the Morning Bench",
    excerpt:
      "A shy orange cat learned to trust the neighborhood after a patient week of breakfasts.",
    body:
      "Mango first appeared near the bakery bench, always just out of reach. A local student started leaving warm kibble and sitting a few steps away each morning.\n\nBy the fourth day, Mango accepted a gentle touch. A nearby foster stepped in with a carrier and a quiet home. After a vet check and a slow introduction to a resident cat, Mango found a forever family just three blocks away.\n\nThe bench now has a note that reads, \"If you feed with care, you rescue with care.\"",
    species: "Cat",
    location: "Singapore",
    dateISO: "2026-01-18",
    coverImage: "/stories/placeholder-1.svg",
  },
  {
    slug: "riverbank-rescue",
    title: "Riverbank Rescue",
    excerpt:
      "A small terrier was spotted limping near the canal, and a jogger stopped to help.",
    body:
      "A jogger noticed a terrier stuck between the reeds, shivering and soaked. He called the community hotline while another passerby offered a towel.\n\nWith a bit of patience and a gentle leash, the pup was guided to safety. A local clinic treated a sprained paw and posted a reunion notice. The owner arrived that evening, grateful and tearful.\n\nThe two volunteers now take turns checking the river path each weekend.",
    species: "Dog",
    location: "Bangkok",
    dateISO: "2025-11-03",
    coverImage: "/stories/placeholder-2.svg",
  },
  {
    slug: "rooftop-songbird",
    title: "Rooftop Songbird",
    excerpt:
      "A tired myna bird rested on a rooftop garden and found a safe hand to land on.",
    body:
      "Neighbors heard a soft chirp and found a myna bird tangled in twine. A gardener used scissors and steady hands to free its wing.\n\nAfter a day of rest and hydration, the bird hopped onto the garden rail and sang again. A wildlife volunteer checked in and confirmed it was safe to release.\n\nThe rooftop garden now keeps a small bowl of fresh water for visiting birds.",
    species: "Bird",
    location: "Kuala Lumpur",
    dateISO: "2025-08-21",
    coverImage: "/stories/placeholder-1.svg",
  },
  {
    slug: "market-lantern-dog",
    title: "The Market Lantern",
    excerpt:
      "A young dog followed the smell of food and ended up finding a warm place to stay.",
    body:
      "At the night market, a small dog lingered beside a lantern stall. The vendor noticed he was wearing a broken collar and offered food and water.\n\nA neighborhood group shared the story, and a family who had recently lost a dog came forward. It was not their dog, but they offered a foster home.\n\nWithin a week, the pup settled in and learned that lantern light can mean home.",
    species: "Dog",
    location: "Penang",
    dateISO: "2026-02-06",
    coverImage: "/stories/placeholder-2.svg",
  },
  {
    slug: "bus-stop-companion",
    title: "Bus Stop Companion",
    excerpt:
      "A calm tabby waited at the bus stop every day until someone noticed the collar tag.",
    body:
      "Commuters shared photos of a tabby cat that sat quietly beside the bus stop bench. A volunteer scanned the tag and found an outdated number.\n\nAfter checking nearby blocks, the volunteer met an elderly neighbor who had been searching for her cat. A simple message board note connected them.\n\nThe bus stop now has a small sign reminding people to update ID tags.",
    species: "Cat",
    location: "Jakarta",
    dateISO: "2025-12-14",
    coverImage: "/stories/placeholder-1.svg",
  },
  {
    slug: "garden-shelter",
    title: "Garden Shelter",
    excerpt:
      "A rescued rabbit found a temporary shelter under a raised garden bed.",
    body:
      "During a heavy rain, a small rabbit took cover under a raised garden bed. The homeowner placed a soft towel and some hay nearby.\n\nA local rescue coordinated transport the next morning and arranged a foster home with safe indoor space. The rabbit, now named Clover, is thriving.\n\nThe garden bed has become a shared community shelter spot for unexpected visitors.",
    species: "Other",
    location: "Manila",
    dateISO: "2025-09-30",
    coverImage: "/stories/placeholder-2.svg",
  },
];
