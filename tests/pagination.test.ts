import { describe, it, expect } from 'vitest';
import express from 'express';
import { getPaginationParams } from '../server/routes';

// since getPaginationParams depends only on the request object, we can
// build a minimal fake express.Request with a query property.
function makeReq(query: Record<string, any>): express.Request {
  return { query } as unknown as express.Request;
}

describe('getPaginationParams', () => {
  it('defaults to page=1 and perPage=100 when no query params provided', () => {
    const params = getPaginationParams(makeReq({}));
    expect(params.page).toBe(1);
    expect(params.perPage).toBe(100);
  });

  it('parses valid numeric strings', () => {
    const params = getPaginationParams(makeReq({ page: '3', perPage: '25' }));
    expect(params.page).toBe(3);
    expect(params.perPage).toBe(25);
  });

  it('normalizes invalid or non-numeric values', () => {
    expect(getPaginationParams(makeReq({ page: '0', perPage: '-5' }))).toEqual({ page: 1, perPage: 1 });
    expect(getPaginationParams(makeReq({ page: 'foo', perPage: 'bar' }))).toEqual({ page: 1, perPage: 100 });
  });

  it('caps perPage at 1000 to prevent abuse', () => {
    expect(getPaginationParams(makeReq({ perPage: '5000' }))).toEqual({ page: 1, perPage: 1000 });
  });

  it('cache key formulation includes page and perPage', () => {
    const { page, perPage } = getPaginationParams(makeReq({ page: '2', perPage: '50' }));
    const userId = 'user123';
    const key = `subscriptions:${userId}:p${page}:n${perPage}`;
    expect(key).toBe('subscriptions:user123:p2:n50');
  });
});
