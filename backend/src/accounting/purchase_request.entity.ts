import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('purchase_requests')
export class PurchaseRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  requester_id: string;

  @Column()
  item_name: string;

  @Column()
  quantity: number;

  @Column('decimal')
  cost: number;

  @Column()
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
