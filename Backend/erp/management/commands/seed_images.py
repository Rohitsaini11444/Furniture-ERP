import os
import urllib.request
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from erp.models import Sample

class Command(BaseCommand):
    help = 'Seeds images for existing Samples'

    def handle(self, *args, **kwargs):
        samples = Sample.objects.all()
        if not samples.exists():
            self.stdout.write(self.style.WARNING('No samples found. Please run seed_data first.'))
            return

        image_urls = [
            "https://images.unsplash.com/photo-1505693314120-0d443867891c?w=400&q=80",
            "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=400&q=80",
            "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",
            "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80",
            "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400&q=80"
        ]

        self.stdout.write('Downloading and assigning images to samples...')
        
        for idx, sample in enumerate(samples):
            url = image_urls[idx % len(image_urls)]
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            try:
                with urllib.request.urlopen(req) as response:
                    content = response.read()
                    file_name = f'sample_{sample.sample_id}.jpg'
                    sample.image.save(file_name, ContentFile(content), save=True)
                    self.stdout.write(f'Added image to {sample.sample_id}')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Failed to download image for {sample.sample_id}: {e}'))

        self.stdout.write(self.style.SUCCESS('Successfully seeded images!'))
