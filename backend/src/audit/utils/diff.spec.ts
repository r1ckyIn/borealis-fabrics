import { buildChangesDiff } from './diff';

describe('buildChangesDiff', () => {
  describe('create action', () => {
    it('should return all non-excluded fields from after state', () => {
      const result = buildChangesDiff('create', null, {
        name: 'Test',
        companyName: 'Acme',
      });
      expect(result).toEqual({ name: 'Test', companyName: 'Acme' });
    });

    it('should exclude id, createdAt, updatedAt, deletedAt fields', () => {
      const result = buildChangesDiff('create', null, {
        id: 1,
        name: 'Test',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      });
      expect(result).toEqual({ name: 'Test' });
    });

    it('should exclude null values from create diff', () => {
      const result = buildChangesDiff('create', null, {
        name: 'Test',
        notes: null,
      });
      expect(result).toEqual({ name: 'Test' });
    });
  });

  describe('update action', () => {
    it('should return changed fields with old/new values', () => {
      const result = buildChangesDiff(
        'update',
        { name: 'Old' },
        { name: 'New' },
      );
      expect(result).toEqual({ name: { old: 'Old', new: 'New' } });
    });

    it('should return empty object when no changes', () => {
      const result = buildChangesDiff(
        'update',
        { name: 'Same' },
        { name: 'Same' },
      );
      expect(result).toEqual({});
    });

    it('should handle multiple changed fields', () => {
      const result = buildChangesDiff(
        'update',
        { name: 'Old', phone: '111' },
        { name: 'New', phone: '222' },
      );
      expect(result).toEqual({
        name: { old: 'Old', new: 'New' },
        phone: { old: '111', new: '222' },
      });
    });

    it('should exclude system fields from update diff', () => {
      const result = buildChangesDiff(
        'update',
        { name: 'Old', updatedAt: new Date('2026-01-01') },
        { name: 'New', updatedAt: new Date('2026-01-02') },
      );
      expect(result).toEqual({ name: { old: 'Old', new: 'New' } });
    });

    it('should use deep equality for complex values', () => {
      const result = buildChangesDiff(
        'update',
        { tags: ['a', 'b'] },
        { tags: ['a', 'b'] },
      );
      expect(result).toEqual({});
    });

    it('should detect changes in complex values', () => {
      const result = buildChangesDiff(
        'update',
        { tags: ['a', 'b'] },
        { tags: ['a', 'c'] },
      );
      expect(result).toEqual({
        tags: { old: ['a', 'b'], new: ['a', 'c'] },
      });
    });
  });

  describe('delete action', () => {
    it('should return all non-excluded fields from before state', () => {
      const result = buildChangesDiff('delete', { name: 'Del', id: 1 }, null);
      expect(result).toEqual({ name: 'Del' });
    });

    it('should exclude null values from delete diff', () => {
      const result = buildChangesDiff(
        'delete',
        { name: 'Del', notes: null },
        null,
      );
      expect(result).toEqual({ name: 'Del' });
    });
  });

  describe('restore action', () => {
    it('should return deletedAt change', () => {
      const timestamp = new Date('2026-01-01');
      const result = buildChangesDiff(
        'restore',
        { deletedAt: timestamp },
        { deletedAt: null },
      );
      expect(result).toEqual({
        deletedAt: { old: timestamp, new: null },
      });
    });
  });
});
