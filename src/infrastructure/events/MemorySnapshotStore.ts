import { ISnapshotStore, EventSnapshot } from "../../shared/types/EventStore";

/**
 * 内存快照存储实现
 */
export class MemorySnapshotStore implements ISnapshotStore {
  private snapshots: Map<string, EventSnapshot> = new Map();

  /**
   * 保存快照
   */
  async saveSnapshot(snapshot: EventSnapshot): Promise<void> {
    this.snapshots.set(snapshot.streamId, {
      ...snapshot,
      createdAt: new Date(),
    });

    console.log(
      `📸 保存快照: ${snapshot.streamId} (版本: ${snapshot.snapshotVersion})`
    );
  }

  /**
   * 获取快照
   */
  async getSnapshot(streamId: string): Promise<EventSnapshot | null> {
    return this.snapshots.get(streamId) || null;
  }

  /**
   * 删除快照
   */
  async deleteSnapshot(streamId: string): Promise<void> {
    const deleted = this.snapshots.delete(streamId);
    if (deleted) {
      console.log(`🗑️ 删除快照: ${streamId}`);
    }
  }

  /**
   * 获取快照版本
   */
  async getSnapshotVersion(streamId: string): Promise<number> {
    const snapshot = this.snapshots.get(streamId);
    return snapshot ? snapshot.snapshotVersion : 0;
  }

  /**
   * 获取所有快照
   */
  async getAllSnapshots(): Promise<EventSnapshot[]> {
    return Array.from(this.snapshots.values());
  }

  /**
   * 获取快照统计信息
   */
  async getStatistics(): Promise<{
    totalSnapshots: number;
    streamTypes: string[];
    oldestSnapshot: Date | null;
    newestSnapshot: Date | null;
  }> {
    const snapshots = Array.from(this.snapshots.values());
    const streamTypes = new Set(snapshots.map((s) => s.streamType));

    let oldestSnapshot: Date | null = null;
    let newestSnapshot: Date | null = null;

    if (snapshots.length > 0) {
      const dates = snapshots.map((s) => s.createdAt);
      oldestSnapshot = new Date(Math.min(...dates.map((d) => d.getTime())));
      newestSnapshot = new Date(Math.max(...dates.map((d) => d.getTime())));
    }

    return {
      totalSnapshots: snapshots.length,
      streamTypes: Array.from(streamTypes),
      oldestSnapshot,
      newestSnapshot,
    };
  }

  /**
   * 清空所有快照
   */
  clear(): void {
    this.snapshots.clear();
  }
}
