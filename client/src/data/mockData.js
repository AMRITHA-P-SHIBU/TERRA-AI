export const currentUser = {
  id: 'usr_terra_01',
  fullName: 'Amritha Shibu',
  username: 'amritha_eco',
  role: 'user', // toggle to 'admin' to test moderation features
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  location: 'Kochi, Kerala',
  bio: 'Passionate about zero-waste living, urban gardening, and circular sustainability 🌿',
  ecoPoints: 345,
  ecoLevel: 3,
  levelTitle: 'Eco Champion',
  nextLevelPoints: 500,
  carbonSavedKg: 124.5,
  actionsCompleted: 18,
  badges: ['seedling', 'eco_warrior', 'clean_champion', 'circular_hero']
};

export const initialFeedPosts = [
  {
    id: 'post-1',
    author: {
      name: 'Rohan Sharma',
      username: 'rohan_nature',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      badge: 'Eco Warrior'
    },
    category: 'tree_planting',
    categoryLabel: 'Tree Planting',
    caption: 'Planted 5 native fruit saplings in our neighborhood community park today! Rain season is the perfect time for root establishment. Let us green our cities 🌳🌧️',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    ecoPointsAwarded: 25,
    likesCount: 38,
    isLiked: false,
    commentsCount: 6,
    status: 'approved',
    createdAt: '2 hours ago',
    location: 'Bangalore, Karnataka'
  },
  {
    id: 'post-2',
    author: {
      name: 'Pooja Krishnan',
      username: 'pooja_zerowaste',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      badge: 'Circular Hero'
    },
    category: 'waste_cleanup',
    categoryLabel: 'Lake Cleanup',
    caption: 'Our Sunday morning lake cleanup drive collected 42kg of discarded plastic bottles and snack wrappers! All sorted and sent to a local mechanical recycling unit.',
    image: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80',
    ecoPointsAwarded: 35,
    likesCount: 74,
    isLiked: true,
    commentsCount: 12,
    status: 'approved',
    createdAt: '5 hours ago',
    location: 'Vembanad, Kerala'
  },
  {
    id: 'post-3',
    author: {
      name: 'Vikram Mehta',
      username: 'vikram_green',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      badge: 'Compost Master'
    },
    category: 'upcycling',
    categoryLabel: 'Upcycled Craft',
    caption: 'Turned discarded coconut shells into hanging planters for money plants and succulents. Natural, biodegradable, and looks great on balconies!',
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80',
    ecoPointsAwarded: 20,
    likesCount: 52,
    isLiked: false,
    commentsCount: 9,
    status: 'approved',
    createdAt: '1 day ago',
    location: 'Pune, Maharashtra'
  }
];

export const initialMarketplaceItems = [
  {
    id: 'item-1',
    title: 'Handcrafted Coconut Shell Planter Pots (Set of 4)',
    seller: {
      name: 'Ananya Roy',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      rating: 4.9
    },
    category: 'coconut_products',
    categoryLabel: 'Coconut Crafts',
    listingType: 'sell',
    price: 240,
    location: 'Fort Kochi, Kerala',
    description: 'Polished with natural coconut oil, drilled drainage holes, and jute suspension cords. 100% organic and eco-friendly.',
    image: 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=600&q=80',
    status: 'approved',
    condition: 'Handmade New',
    createdAt: 'Yesterday'
  },
  {
    id: 'item-2',
    title: 'Terracotta 3-Tier Kitchen Compost Bin',
    seller: {
      name: 'Devendra Patel',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
      rating: 4.8
    },
    category: 'compost_bins',
    categoryLabel: 'Compost Bins',
    listingType: 'exchange',
    price: 0,
    exchangeFor: 'Organic heirloom seeds or indoor plant saplings',
    location: 'Indiranagar, Bangalore',
    description: 'Breathe life into kitchen scraps without bad odors! Terracotta aerates naturally. Downsizing to a smaller apartment, eager to exchange.',
    image: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80',
    status: 'approved',
    condition: 'Lightly Used',
    createdAt: '2 days ago'
  },
  {
    id: 'item-3',
    title: 'Organic Heirloom Tomato & Chilli Seedlings (10 Nos)',
    seller: {
      name: 'Amritha Shibu',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      rating: 5.0
    },
    category: 'plants_seeds',
    categoryLabel: 'Seeds & Plants',
    listingType: 'donate',
    price: 0,
    location: 'Kakkanad, Kochi',
    description: 'Grown from self-harvested native seeds, healthy root systems in coco-peat plugs. Free to any gardening enthusiast!',
    image: 'https://images.unsplash.com/photo-1598983062491-5934be558814?auto=format&fit=crop&w=600&q=80',
    status: 'approved',
    condition: 'Fresh Seedlings',
    createdAt: '3 days ago'
  },
  {
    id: 'item-4',
    title: 'Heavy Duty Stainless Steel Gardening Hand Trowel',
    seller: {
      name: 'Karthik Raja',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
      rating: 4.7
    },
    category: 'gardening_tools',
    categoryLabel: 'Gardening Tools',
    listingType: 'sell',
    price: 180,
    location: 'Adyar, Chennai',
    description: 'FSC-certified ashwood handle with rust-resistant carbon steel head. Built to last decades rather than throwaway plastic tools.',
    image: 'https://images.unsplash.com/photo-1617576683096-00fc8eecb3af?auto=format&fit=crop&w=600&q=80',
    status: 'approved',
    condition: 'Like New',
    createdAt: '4 days ago'
  }
];

export const badgesData = [
  {
    id: 'seedling',
    name: 'Green Seedling',
    description: 'Joined the Terra AI sustainability network',
    icon: '🌱',
    unlocked: true,
    points: 0
  },
  {
    id: 'eco_warrior',
    name: 'Eco Warrior',
    description: 'Completed 5 verified green community activities',
    icon: '🛡️',
    unlocked: true,
    points: 50
  },
  {
    id: 'clean_champion',
    name: 'Clean Champion',
    description: 'Led or participated in waste cleanup & recycling',
    icon: '♻️',
    unlocked: true,
    points: 100
  },
  {
    id: 'circular_hero',
    name: 'Circular Hero',
    description: 'Rehomed or exchanged items in the Eco Exchange Hub',
    icon: '🔄',
    unlocked: true,
    points: 150
  },
  {
    id: 'carbon_cutter',
    name: 'Carbon Cutter',
    description: 'Reduced monthly carbon footprint by over 20%',
    icon: '📉',
    unlocked: false,
    points: 250
  },
  {
    id: 'compost_master',
    name: 'Compost Master',
    description: 'Diverted 50kg+ organic waste from landfills',
    icon: '🪴',
    unlocked: false,
    points: 400
  }
];

export const leaderboardData = [
  { rank: 1, name: 'Pooja Krishnan', points: 840, level: 'Planet Guardian', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', actions: 42, badge: '👑' },
  { rank: 2, name: 'Rohan Sharma', points: 690, level: 'Earth Protector', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', actions: 34, badge: '🥈' },
  { rank: 3, name: 'Vikram Mehta', points: 520, level: 'Sustainability Pro', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', actions: 26, badge: '🥉' },
  { rank: 4, name: 'Amritha Shibu (You)', points: 345, level: 'Eco Champion', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', actions: 18, badge: '⭐' },
  { rank: 5, name: 'Ananya Roy', points: 310, level: 'Green Advocate', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', actions: 15, badge: '🌿' },
  { rank: 6, name: 'Devendra Patel', points: 280, level: 'Green Advocate', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80', actions: 13, badge: '🌿' }
];

export const initialAiSuggestions = [
  'How can I start a zero-smell compost bin on an apartment balcony?',
  'What are some practical replacements for single-use plastic in the kitchen?',
  'How do I calculate if installing residential solar panels is worth it?',
  'Suggest 5 creative ways to upcycle discarded plastic bottles or coconut shells.'
];
