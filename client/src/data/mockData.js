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

export const initialAiSuggestions = [
  'How can I start a zero-smell compost bin on an apartment balcony?',
  'What are some practical replacements for single-use plastic in the kitchen?',
  'How do I calculate if installing residential solar panels is worth it?',
  'Suggest 5 creative ways to upcycle discarded plastic bottles or coconut shells.'
];
