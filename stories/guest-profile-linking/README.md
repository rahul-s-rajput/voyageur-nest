# Guest Profile Linking Implementation Stories

## 📋 Overview
This epic addresses the critical issue where bookings are not properly linking to guest profiles, preventing proper guest history tracking and management. The implementation will ensure 100% guest profile coverage across all booking sources.

## 🎯 Epic Goals
1. Fix core linking mechanism in booking service
2. Add guest profile creation to email imports
3. Link all historical bookings to guest profiles
4. Implement duplicate detection and merging
5. Ensure system-wide data integrity

## 📊 Current State vs Target State

| Metric | Current State | Target State |
|--------|--------------|--------------|
| Bookings with guest profiles | ~10% | 100% |
| OTA bookings with profiles | 0% | 100% |
| Duplicate guest profiles | Unknown | < 5% |
| Guest history tracking | Broken | Fully functional |
| Check-in profile linking | Working | Maintained |

## 📚 Implementation Stories

### [Story 1: Fix Booking Service](./01-fix-booking-service.md) — Completed
**Priority: HIGH** | **Effort: 1 hour**
- Fix bookingService.createBooking to handle guest_profile_id
- Update legacy service wrapper
- Core issue that blocks all guest linking

### [Story 2: Email Import Guest Profiles](./02-email-import-guest-profiles.md)
**Priority: HIGH** | **Effort: 2.5 hours**
- Add guest profile creation/linking to email imports
- Handle Booking.com and GoMMT imports
- Match existing guests by email/phone

### [Story 3: Database Migration](./03-database-migration.md)
**Priority: HIGH** | **Effort: 2 hours**
- Link all existing bookings to guest profiles
- Create profiles for bookings without matches
- Recalculate all guest statistics

### [Story 4: Duplicate Detection & Merging](./04-duplicate-detection-merging.md)
**Priority: MEDIUM** | **Effort: 7 hours**
- Implement duplicate detection algorithms
- Create UI for merging duplicates
- Clean up existing duplicate profiles

### [Story 5: Testing & Validation](./05-testing-validation.md)
**Priority: CRITICAL** | **Effort: 8 hours**
- Comprehensive end-to-end testing
- Performance validation
- Regression testing
- Production readiness checks

## 🚀 Implementation Order

```mermaid
graph LR
    A[Story 1: Fix Service] --> B[Story 2: Email Import]
    B --> C[Story 3: Migration]
    C --> D[Story 4: Duplicates]
    D --> E[Story 5: Testing]
    E --> F[Production Deploy]
```

## ⏱️ Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Development (Stories 1-2) | 1 day | None |
| Migration (Story 3) | 0.5 day | Stories 1-2 complete |
| Enhancement (Story 4) | 1 day | Story 3 complete |
| Testing (Story 5) | 1 day | All stories complete |
| **Total** | **3.5 days** | |

## 🎯 Definition of Done

- [ ] All new bookings automatically link to guest profiles
- [ ] Email imports create/update guest profiles
- [ ] All historical bookings linked to profiles
- [ ] Duplicate detection and merging functional
- [ ] Guest statistics accurate and auto-updating
- [ ] All tests passing with > 95% coverage
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] No regression in existing features

## 🚨 Risk Mitigation

| Risk | Impact | Mitigation |
|------|---------|-----------|
| Data loss during migration | High | Full database backup before migration |
| Performance degradation | Medium | Test with production-size dataset |
| Duplicate profile creation | Low | Implement strong matching logic |
| Breaking existing features | High | Comprehensive regression testing |

## 📊 Success Metrics

After implementation, we should see:
- **100%** of new bookings with guest profiles
- **< 5 seconds** to process 100 email imports
- **< 5%** duplicate guest profiles
- **100%** OTA bookings linked to profiles
- **Zero** data loss during migration
- **< 2%** error rate in production

## 🔍 Monitoring & Alerts

Set up monitoring for:
- Guest profile creation rate
- Booking-to-profile linking success rate
- Duplicate detection accuracy
- Email import processing time
- Database query performance

## 📝 Notes

- **Check-in form already works** - Don't modify it
- **Field naming clarification** - Use `guest_profile_id` (snake_case) for database fields
- **Consider future enhancements**:
  - Guest profile photos
  - Preference tracking
  - Loyalty programs
  - Marketing segmentation

## 🏁 Getting Started

1. Review all stories in detail
2. Set up test environment with production-like data
3. Create database backup
4. Start with Story 1 (Fix Booking Service)
5. Follow implementation order strictly
6. Run tests after each story completion

---

**Last Updated**: January 2025
**Owner**: Development Team
**Status**: Ready for Implementation