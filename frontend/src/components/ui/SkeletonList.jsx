import { Skeleton, Stack, Box } from '@mui/material';

const SkeletonList = ({
  rows = 5,
  withAvatar = true,
  variant = 'list', // list | card | dense
  animation = 'wave', // wave | pulse | false
  avatarSize = 40,
  padding = 2
}) => {
  const layouts = {
    list: {
      line1: '70%',
      line2: '40%',
      spacing: 1.5
    },
    dense: {
      line1: '60%',
      line2: '30%',
      spacing: 1
    },
    card: {
      line1: '80%',
      line2: '50%',
      spacing: 2
    }
  };

  const cfg = layouts[variant] || layouts.list;

  return (
    <Stack
      spacing={cfg.spacing}
      sx={{ p: padding }}
      aria-busy="true"
      role="status"
    >
      {Array.from({ length: rows }).map((_, idx) => (
        <Box
          key={`skeleton-${idx}`}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          {withAvatar && (
            <Skeleton
              variant="circular"
              width={avatarSize}
              height={avatarSize}
              animation={animation}
            />
          )}

          <Stack spacing={0.5} flex={1}>
            <Skeleton
              variant="text"
              width={cfg.line1}
              height={18}
              animation={animation}
            />
            <Skeleton
              variant="text"
              width={cfg.line2}
              height={16}
              animation={animation}
            />
          </Stack>
        </Box>
      ))}
    </Stack>
  );
};

export default SkeletonList;
