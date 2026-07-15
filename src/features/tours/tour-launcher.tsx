'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import { useTour } from './tour-provider';

export function TourLauncher() {
  const { availableTours, startTour } = useTour();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          aria-label='Mở tour hướng dẫn'
          data-tour='header-tour-launcher'
        >
          <Icons.help className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-72'>
        <DropdownMenuLabel>Tour hướng dẫn</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableTours.length > 0 ? (
          availableTours.map((tour) => (
            <DropdownMenuItem key={tour.id} onClick={() => startTour(tour.id)}>
              <div className='flex flex-col gap-0.5'>
                <span>{tour.label}</span>
                <span className='text-muted-foreground text-xs'>{tour.description}</span>
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>Màn này chưa có tour riêng.</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
