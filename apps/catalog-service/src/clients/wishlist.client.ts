import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

interface ItemPayload {
  id: string;
  title: string;
  description?: string | null;
  sellerId: string;
  categoryId: string;
}

@Injectable()
export class WishlistClient {
  constructor(@Inject('WISHLIST_PACKAGE') private readonly client: ClientProxy) {}

  evaluateItem(item: ItemPayload) {
    // Only forward the fields the auto-match evaluator actually reads — the full Prisma
    // row also carries a Decimal `price` and other fields with no place in this contract.
    this.client.emit('catalog.item.created', {
      id: item.id,
      title: item.title,
      description: item.description,
      sellerId: item.sellerId,
      categoryId: item.categoryId,
    });
  }
}
