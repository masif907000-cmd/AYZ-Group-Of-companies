-- Adds per-duration availability flags to the tools table.
-- Admin can control which subscription lengths (1 Month / 6 Months / 1 Year)
-- are available for each tool. Default true so existing tools keep showing all.
alter table tools
  add column if not exists available_1m  boolean not null default true,
  add column if not exists available_6m  boolean not null default true,
  add column if not exists available_1y  boolean not null default true;
