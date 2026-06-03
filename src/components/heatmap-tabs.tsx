"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriceBandHeatmap, type MatrixData } from "./price-band-heatmap";

export function HeatmapTabs({
  self,
  songshu,
  kuaisong,
}: {
  self: MatrixData;
  songshu: MatrixData;
  kuaisong: MatrixData;
}) {
  return (
    <Tabs defaultValue="songshu" className="w-full">
      <TabsList>
        <TabsTrigger value="songshu">vs 松鼠便利</TabsTrigger>
        <TabsTrigger value="kuaisong">vs 快送熊</TabsTrigger>
      </TabsList>
      <TabsContent value="songshu" className="mt-4">
        <PriceBandHeatmap selfData={self} rivalData={songshu} rivalName="松鼠便利" />
      </TabsContent>
      <TabsContent value="kuaisong" className="mt-4">
        <PriceBandHeatmap selfData={self} rivalData={kuaisong} rivalName="快送熊" />
      </TabsContent>
    </Tabs>
  );
}
