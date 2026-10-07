import { api } from './client';
import { fetchProfile } from './profiles';
import type { Review, SellerStats } from '../types';

interface ApiReview {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface ApiSellerRating {
  revieweeId: string;
  averageRating: number;
  totalReviews: number;
}

const REVIEWS = '/api/v1/reviews';

function reviewDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export async function fetchSellerReviews(sellerId: string): Promise<Review[]> {
  const reviews = await api<ApiReview[]>(`${REVIEWS}/users/${sellerId}/reviews`);
  return Promise.all(reviews.map(async (review) => {
    const reviewer = await fetchProfile(review.reviewerId);
    return {
      id: review.id,
      name: reviewer?.displayName ?? 'CU member',
      item: 'Verified completed purchase',
      when: reviewDate(review.createdAt),
      stars: review.rating,
      text: review.comment ?? '',
    };
  }));
}

export async function fetchSellerRating(sellerId: string): Promise<SellerStats> {
  const rating = await api<ApiSellerRating>(`${REVIEWS}/users/${sellerId}/rating`);
  return { avg: rating.averageRating, count: rating.totalReviews };
}

export function createReview(payload: { orderId: string; rating: number; comment?: string }) {
  return api<ApiReview>(REVIEWS, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
